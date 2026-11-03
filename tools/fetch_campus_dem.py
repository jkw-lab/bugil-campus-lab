#!/usr/bin/env python3
"""Download an attributed, geographically aligned *coarse* 90 m Copernicus DEM.

The public service is Open-Meteo's Elevation API (GLO-90).
This does not replace precise contour/DXF terrain surveying. No smoothing
or artificial steepness is applied to the elevation measurements.
"""
import json
import math
import pathlib
import time
import urllib.parse
import urllib.request

ORIGIN_LON = 127.1585
ORIGIN_LAT = 36.8315
W = H = 21
STEP = 90
X_MIN = Z_MIN = -900
M_PER_LON = 111320 * math.cos(math.radians(ORIGIN_LAT))
M_PER_LAT = 111133
points = [
    (
        ORIGIN_LAT - (Z_MIN + iz * STEP) / M_PER_LAT,
        ORIGIN_LON + (X_MIN + ix * STEP) / M_PER_LON,
    )
    for iz in range(H) for ix in range(W)
]

heights = []
for i in range(0, len(points), 75):
    group = points[i:i + 75]
    params = urllib.parse.urlencode({
        "latitude": ",".join(f"{p[0]:.7f}" for p in group),
        "longitude": ",".join(f"{p[1]:.7f}" for p in group),
    })
    url = "https://api.open-meteo.com/v1/elevation?" + params
    last_error = None
    for retry in range(4):
        try:
            req = urllib.request.Request(url, headers={
                "User-Agent": "BugilCampusLab-public-DEM-preview/0.1"
            })
            with urllib.request.urlopen(req, timeout=25) as response:
                obj = json.load(response)
            vals = obj.get("elevation", [])
            if len(vals) != len(group):
                raise RuntimeError(f"expected {len(group)} heights, got {len(vals)}: {obj}")
            if not all(isinstance(v, (int, float)) and math.isfinite(v)
                       and 0 < v < 500 for v in vals):
                raise RuntimeError("DEM response includes invalid samples")
            heights.extend(round(float(v), 2) for v in vals)
            break
        except Exception as exc:
            last_error = exc
            time.sleep((retry + 1) * 2)
    else:
        raise RuntimeError("DEM API download failed") from last_error

assert len(heights) == W * H
altitude_range = max(heights) - min(heights)
assert altitude_range > 1, "Unexpectedly flat heightmap data"
output = {
    "dataset": "Copernicus DEM GLO-90 (2021) via Open-Meteo Elevation API",
    "source": "https://open-meteo.com/en/docs/elevation-api",
    "acknowledgement": "Copernicus Programme, Open-Meteo",
    "licenseNotice": "GLO-90 90-metre resolution; not campus survey or precise grading",
    "coordinateSystem": "EPSG:4326",
    "origin": {"lat": ORIGIN_LAT, "lon": ORIGIN_LON},
    "width": W, "height": H, "minX": X_MIN, "minZ": Z_MIN,
    "stepMetres": STEP, "heightsMetres": heights,
    "centerElevationMetres": heights[(H // 2) * W + W // 2],
    "rangeMetres": [min(heights), max(heights)],
}
outfile = pathlib.Path("geo/campus-glo90-dem.json")
outfile.parent.mkdir(parents=True, exist_ok=True)
outfile.write_text(json.dumps(output, ensure_ascii=False, separators=(",", ":")) + "\n",
                   encoding="utf-8")
print("DEM written:", outfile, "points", len(heights),
      "range", min(heights), max(heights))
