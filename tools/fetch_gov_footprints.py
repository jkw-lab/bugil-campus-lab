#!/usr/bin/env python3
"""Fetch public Korean government-origin building footprints, with zero inferred shapes.

ArcGIS item metadata identifies the host, provenance and polygon FeatureLayer.
A missing/blocked layer is recorded as a diagnostic failure, never replaced by
photo-traced or synthetic building geometry.
"""
import json
import pathlib
import urllib.parse
import urllib.request
import sys

ITEM_ID = "b2c7a37bac8d4e40a85435b3f3d96d05"
ITEM_API = "https://www.arcgis.com/sharing/rest/content/items/" + ITEM_ID
# Fetch a small area around the two public high-school campuses.
BBOX = [127.1562, 36.8288, 127.1630, 36.8346]
OUT = pathlib.Path("geo/gov-building-footprints.geojson")
REPORT = pathlib.Path("geo/gov-footprints-status.json")


def fetch_json(url, params=None):
    if params:
        url += ("&" if "?" in url else "?") + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": "BugilCampusGeodata/1.0 (+public footprint reproducibility)"})
    with urllib.request.urlopen(req, timeout=35) as resp:
        payload = resp.read()
    parsed = json.loads(payload)
    if not isinstance(parsed, dict):
        raise RuntimeError("Expected a JSON object from public ArcGIS")
    if parsed.get("error"):
        raise RuntimeError("ArcGIS error: " + str(parsed["error"]))
    return parsed


def is_polygon(geometry):
    return (
        geometry and geometry.get("type") in ("Polygon", "MultiPolygon")
        and bool(geometry.get("coordinates"))
    )


def main():
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    report = {"itemID": ITEM_ID, "itemAPI": ITEM_API, "bboxWGS84": BBOX, "status": "no_data", "reason": ""}
    try:
        item = fetch_json(ITEM_API, {"f": "json"})
        report["itemTitle"] = item.get("title")
        report["itemType"] = item.get("type")
        report["itemOwner"] = item.get("owner")
        report["itemAccess"] = item.get("access")
        report["itemLicenseInfo"] = str(item.get("licenseInfo") or "")[:3000]
        service_url = (item.get("url") or "").rstrip("/")
        if not service_url.startswith("https://"):
            raise RuntimeError("ArcGIS item lacks a public HTTPS feature service URL")
        report["serviceUrl"] = service_url

        # ArcGIS Item URL can end with .../FeatureServer OR .../FeatureServer/0.
        if service_url.split("/")[-1].isdigit():
            layers = [service_url]
        else:
            service = fetch_json(service_url, {"f": "json"})
            layers = [service_url + "/" + str(layer["id"]) for layer in service.get("layers", [])
                      if layer.get("type", "Feature Layer") != "Table"]
        report["candidateLayerUrls"] = layers
        if not layers:
            raise RuntimeError("ArcGIS has no selectable feature layer")

        selected = None
        for layer_url in layers:
            try:
                layer = fetch_json(layer_url, {"f": "json"})
                if layer.get("geometryType") == "esriGeometryPolygon" and layer.get("capabilities", "").lower().find("query") >= 0:
                    selected = (layer_url, layer)
                    break
            except Exception:
                continue
        if not selected:
            raise RuntimeError("No accessible/queryable polygon layer")
        layer_url, layer = selected
        report["selectedLayerUrl"] = layer_url
        report["layerName"] = layer.get("name")
        report["layerExtent"] = layer.get("extent")
        params = {
            "f": "geojson",
            "geometry": ",".join(str(x) for x in BBOX),
            "geometryType": "esriGeometryEnvelope",
            "inSR": "4326",
            "spatialRel": "esriSpatialRelIntersects",
            "where": "1=1",
            "outFields": "*",
            "returnGeometry": "true",
            "outSR": "4326",
            "resultRecordCount": "2000",
        }
        features = fetch_json(layer_url + "/query", params)
        feats = features.get("features", [])
        if not feats:
            raise RuntimeError("No building footprint polygons inside bbox")
        if len(feats) >= 2000 or features.get("exceededTransferLimit"):
            raise RuntimeError("Request may be truncated; reduce bbox before use")
        cleaned = []
        for n, f in enumerate(feats):
            geom = f.get("geometry")
            if not is_polygon(geom):
                continue
            coords = geom["coordinates"]
            # Ensure response is WGS84 rather than a projected source CRS.
            pt = coords[0][0] if geom["type"] == "Polygon" else coords[0][0][0]
            if len(pt) < 2 or not (126 < pt[0] < 129 and 35 < pt[1] < 39):
                raise RuntimeError("Coordinates are not EPSG:4326 lon/lat")
            props = f.get("properties") or {}
            cleaned.append({
                "type": "Feature",
                "id": "gov-building:" + str(f.get("id") or props.get("OBJECTID") or props.get("FID") or n),
                "properties": {
                    **props,
                    "_featureType": "building",
                    "_geometrySource": layer_url,
                    "_itemID": ITEM_ID,
                    "_measuredHeight": False,
                    "_footprintIsPublicGeometry": True
                },
                "geometry": geom,
            })
        if len(cleaned) < 5:
            raise RuntimeError("Too few valid building polygons")
        output = {
            "type": "FeatureCollection",
            "name": "Korean-government-origin building footprints (public feature geometry)",
            "coordinateSystem": "EPSG:4326",
            "source": item.get("title") or "Korea Building Footprints v2",
            "sourceItem": ITEM_API,
            "sourceLayer": layer_url,
            "sourceProvenance": "행정안전부 주소기반산업지원서비스, via public ArcGIS item (see item metadata)",
            "footprintsAreObserved": True,
            "buildingIdentityVerified": False,
            "buildingHeightAvailable": False,
            "features": cleaned,
        }
        OUT.write_text(json.dumps(output, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
        report["status"] = "ready"
        report["featureCount"] = len(cleaned)
        report["reason"] = "Public footprints downloaded; identities and actual heights are not determined from polygon geometry alone"
        print("Saved", len(cleaned), "government-origin building boundaries")
    except Exception as exc:
        report["reason"] = type(exc).__name__ + ": " + str(exc)
        print("Source not usable:", report["reason"], file=sys.stderr)
    finally:
        REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
