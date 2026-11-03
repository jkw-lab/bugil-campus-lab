#!/usr/bin/env python3
"""Read public OSM building/road/land geometry near a given coordinate.

Use only a publicly sourced coordinate and check its alignment against local
game landmarks before treating these features as a verified campus outline.

Example:
 python3 tools/fetch_osm.py --lat LAT --lon LON --radius 700 --output geo/osm-latest.geojson

Offline:
 python3 tools/fetch_osm.py --osm-json raw/overpass.json --output geo/osm-latest.geojson

The output remains WGS84 [longitude, latitude], with ODbL attribution.
No individual locations, interior layouts or entrance data are requested.
"""
import argparse
import json
import math
import pathlib
import sys
import urllib.parse
import urllib.request

ENDPOINTS = [
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass-api.de/api/interpreter",
]
USER_AGENT = "BugilCampusLab-GeoVerify/0.1 (public-data-import)"

def fetch(lat, lon, radius):
    ns = radius / 110987.0
    ew = radius / (111320.0 * math.cos(math.radians(lat)))
    bbox = (lat - ns, lon - ew, lat + ns, lon + ew)
    box = ",".join("{:.7f}".format(v) for v in bbox)
    query = (
        "[out:json][timeout:90];("
        'way["building"](' + box + ");"
        'way["highway"](' + box + ");"
        'way["landuse"](' + box + ");"
        'way["leisure"](' + box + ");"
        ");out geom;"
    )
    body = urllib.parse.urlencode({"data": query}).encode("utf-8")
    for url in ENDPOINTS:
        req = urllib.request.Request(
            url, data=body, headers={"User-Agent": USER_AGENT}
        )
        try:
            with urllib.request.urlopen(req, timeout=115) as response:
                payload = json.load(response)
            if "elements" in payload:
                return payload
        except (OSError, ValueError) as exc:
            print("fetch failed:", type(exc).__name__, file=sys.stderr)
    raise RuntimeError("Public OSM Overpass request failed. Use --osm-json with an existing export.")

def geometry_of(el):
    if el.get("type") != "way":
        return None
    pts = [(p.get("lon"), p.get("lat")) for p in el.get("geometry", [])]
    if len(pts) < 2 or not all(isinstance(a, (int, float)) and isinstance(b, (int, float)) for a, b in pts):
        return None
    tag = el.get("tags") or {}
    if "building" in tag:
        if len(pts) < 4:
            return None
        if pts[0] != pts[-1]:
            pts.append(pts[0])
        return ("building", {"type": "Polygon", "coordinates": [pts]})
    if "highway" in tag:
        return ("road", {"type": "LineString", "coordinates": pts})
    if ("landuse" in tag or "leisure" in tag) and len(pts) >= 4:
        if pts[0] != pts[-1]:
            pts.append(pts[0])
        return ("land", {"type": "Polygon", "coordinates": [pts]})
    return None

def main():
    parser = argparse.ArgumentParser(description="Convert public OSM ways to geographic GeoJSON.")
    parser.add_argument("--lat", type=float)
    parser.add_argument("--lon", type=float)
    parser.add_argument("--radius", type=int, default=700)
    parser.add_argument("--osm-json", type=pathlib.Path)
    parser.add_argument("--output", type=pathlib.Path, default=pathlib.Path("geo/osm-latest.geojson"))
    args = parser.parse_args()
    if args.osm_json:
        source = json.loads(args.osm_json.read_text(encoding="utf-8"))
    else:
        if args.lat is None or args.lon is None:
            parser.error("specify --lat and --lon, or --osm-json for an offline conversion")
        if not (33 <= args.lat <= 39 and 124 <= args.lon <= 132):
            parser.error("check Korean map center: latitude must be 33..39 and longitude 124..132")
        if not (100 <= args.radius <= 1800):
            parser.error("radius must be between 100 and 1800 meters")
        source = fetch(args.lat, args.lon, args.radius)
    features = []
    for item in source.get("elements", []):
        result = geometry_of(item)
        if not result:
            continue
        kind, geometry = result
        tag = item.get("tags") or {}
        features.append({
            "type": "Feature",
            "id": item["type"] + "/" + str(item["id"]),
            "properties": {
                "source": "OpenStreetMap",
                "featureType": kind,
                "name": tag.get("name"),
                "building": tag.get("building"),
                "building:levels": tag.get("building:levels"),
                "height": tag.get("height"),
                "highway": tag.get("highway"),
                "landuse": tag.get("landuse"),
                "leisure": tag.get("leisure"),
                "verified": False,
            },
            "geometry": geometry,
        })
    doc = {
        "type": "FeatureCollection",
        "name": "BUGIL campus vicinity - OSM comparison (unregistered)",
        "attribution": "© OpenStreetMap contributors (ODbL)",
        "coordinateSystem": "EPSG:4326 (WGS84 longitude, latitude)",
        "alignmentVerified": False,
        "features": features,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(doc, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    buildings = sum(f["properties"]["featureType"] == "building" for f in features)
    roads = sum(f["properties"]["featureType"] == "road" for f in features)
    print("saved", args.output, "features", len(features), "buildings", buildings, "roads", roads)
    print("WARNING: no automatic alignment, no automatic overwrite of campus-data.js")

if __name__ == "__main__":
    main()
