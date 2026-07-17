#!/usr/bin/env python3
"""裁剪并分析新华街道范围内的 Copernicus GLO-30 高程。"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image


def point_in_polygon(x: float, z: float, polygon: list[list[float]]) -> bool:
    inside = False
    previous = len(polygon) - 1
    for index, current_point in enumerate(polygon):
        previous_point = polygon[previous]
        crosses = (current_point[1] > z) != (previous_point[1] > z)
        if crosses:
            edge_x = (
                (previous_point[0] - current_point[0])
                * (z - current_point[1])
                / (previous_point[1] - current_point[1])
                + current_point[0]
            )
            if x < edge_x:
                inside = not inside
        previous = index
    return inside


def stats(values: np.ndarray) -> dict[str, float | int]:
    clean = values[np.isfinite(values)]
    percentiles = np.percentile(clean, [0, 5, 10, 25, 50, 75, 90, 95, 100])
    return {
        "count": int(clean.size),
        "min": round(float(percentiles[0]), 3),
        "p05": round(float(percentiles[1]), 3),
        "p10": round(float(percentiles[2]), 3),
        "p25": round(float(percentiles[3]), 3),
        "median": round(float(percentiles[4]), 3),
        "p75": round(float(percentiles[5]), 3),
        "p90": round(float(percentiles[6]), 3),
        "p95": round(float(percentiles[7]), 3),
        "max": round(float(percentiles[8]), 3),
        "mean": round(float(clean.mean()), 3),
        "stddev": round(float(clean.std()), 3),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dem", required=True, type=Path)
    parser.add_argument("--map", required=True, type=Path)
    parser.add_argument("--landmarks", required=True, type=Path)
    parser.add_argument("--analysis-output", required=True, type=Path)
    parser.add_argument("--grid-output", required=True, type=Path)
    arguments = parser.parse_args()

    map_data = json.loads(arguments.map.read_text())
    landmark_data = json.loads(arguments.landmarks.read_text())
    center_lon, center_lat = map_data["meta"]["centerWgs84"]
    meters_per_scene_unit = map_data["meta"]["metersPerSceneUnit"]
    meters_per_lon_degree = 111_320 * math.cos(math.radians(center_lat))
    meters_per_lat_degree = 110_540

    def scene_to_lon_lat(x: float, z: float) -> tuple[float, float]:
        return (
            center_lon + x * meters_per_scene_unit / meters_per_lon_degree,
            center_lat - z * meters_per_scene_unit / meters_per_lat_degree,
        )

    image = Image.open(arguments.dem)
    pixel_scale = image.tag_v2[33550]
    tie_point = image.tag_v2[33922]
    pixel_lon = float(pixel_scale[0])
    pixel_lat = float(pixel_scale[1])
    origin_lon = float(tie_point[3])
    origin_lat = float(tie_point[4])

    boundary_lon_lat = [scene_to_lon_lat(x, z) for x, z in map_data["boundary"]]
    west = min(point[0] for point in boundary_lon_lat)
    east = max(point[0] for point in boundary_lon_lat)
    south = min(point[1] for point in boundary_lon_lat)
    north = max(point[1] for point in boundary_lon_lat)

    left = max(0, math.floor((west - origin_lon) / pixel_lon) - 2)
    right = min(image.width, math.ceil((east - origin_lon) / pixel_lon) + 3)
    top = max(0, math.floor((origin_lat - north) / pixel_lat) - 2)
    bottom = min(image.height, math.ceil((origin_lat - south) / pixel_lat) + 3)
    crop = np.asarray(image.crop((left, top, right, bottom)), dtype=np.float64)

    # 5×5 邻域的 20 分位只用于判断建筑和树木偏差，不冒充测绘 DTM。
    padded = np.pad(crop, 2, mode="edge")
    windows = np.lib.stride_tricks.sliding_window_view(padded, (5, 5))
    local_p20 = np.percentile(windows, 20, axis=(-2, -1))

    mask = np.zeros(crop.shape, dtype=bool)
    scene_x = np.zeros(crop.shape, dtype=np.float64)
    scene_z = np.zeros(crop.shape, dtype=np.float64)
    for row in range(crop.shape[0]):
        latitude = origin_lat - (top + row) * pixel_lat
        for column in range(crop.shape[1]):
            longitude = origin_lon + (left + column) * pixel_lon
            x = (longitude - center_lon) * meters_per_lon_degree / meters_per_scene_unit
            z = -(latitude - center_lat) * meters_per_lat_degree / meters_per_scene_unit
            scene_x[row, column] = x
            scene_z[row, column] = z
            mask[row, column] = point_in_polygon(x, z, map_data["boundary"])

    raw_values = crop[mask]
    filtered_values = local_p20[mask]

    def scene_to_crop_pixel(x: float, z: float) -> tuple[int, int]:
        longitude, latitude = scene_to_lon_lat(x, z)
        column = round((longitude - origin_lon) / pixel_lon) - left
        row = round((origin_lat - latitude) / pixel_lat) - top
        return int(row), int(column)

    road_pixels: set[tuple[int, int]] = set()
    for road in map_data["roads"]:
        if road.get("bridge") or road.get("tunnel"):
            continue
        points = road["points"]
        for start, end in zip(points, points[1:]):
            distance_scene = math.hypot(end[0] - start[0], end[1] - start[1])
            sample_count = max(1, math.ceil(distance_scene * meters_per_scene_unit / 10))
            for sample in range(sample_count + 1):
                ratio = sample / sample_count
                x = start[0] + (end[0] - start[0]) * ratio
                z = start[1] + (end[1] - start[1]) * ratio
                row, column = scene_to_crop_pixel(x, z)
                if 0 <= row < crop.shape[0] and 0 <= column < crop.shape[1] and mask[row, column]:
                    road_pixels.add((row, column))

    road_rows = np.array([point[0] for point in road_pixels], dtype=int)
    road_columns = np.array([point[1] for point in road_pixels], dtype=int)
    road_raw = crop[road_rows, road_columns]
    road_filtered = local_p20[road_rows, road_columns]
    road_x_meters = scene_x[road_rows, road_columns] * meters_per_scene_unit
    road_z_meters = scene_z[road_rows, road_columns] * meters_per_scene_unit

    # 用滤波后的道路样本拟合街区尺度平面，并迭代剔除明显的楼木残差。
    design = np.column_stack([road_x_meters, road_z_meters, np.ones(road_filtered.size)])
    keep = np.ones(road_filtered.size, dtype=bool)
    coefficients = np.zeros(3)
    for _ in range(4):
        coefficients, *_ = np.linalg.lstsq(design[keep], road_filtered[keep], rcond=None)
        residuals = road_filtered - design @ coefficients
        center = np.median(residuals[keep])
        deviation = np.median(np.abs(residuals[keep] - center)) * 1.4826
        keep = np.abs(residuals - center) <= max(1.0, deviation * 2.5)

    fitted = design @ coefficients
    residuals = road_filtered - fitted
    boundary_meters = np.array(map_data["boundary"], dtype=np.float64) * meters_per_scene_unit
    boundary_design = np.column_stack([
        boundary_meters[:, 0],
        boundary_meters[:, 1],
        np.ones(boundary_meters.shape[0]),
    ])
    boundary_fitted = boundary_design @ coefficients

    landmark_positions = {
        "huashanGreenland": landmark_data["huashanGreenland"]["position"],
        "shangshengXinsuo": landmark_data["shangshengXinsuo"]["position"],
        "xingfuli": map_data["landmarks"]["xingfuli"]["position"],
    }
    landmark_samples = {}
    for name, (x, z) in landmark_positions.items():
        row, column = scene_to_crop_pixel(x, z)
        row_start = max(0, row - 1)
        row_end = min(crop.shape[0], row + 2)
        column_start = max(0, column - 1)
        column_end = min(crop.shape[1], column + 2)
        landmark_samples[name] = {
            "scenePosition": [x, z],
            "wgs84": [round(value, 7) for value in scene_to_lon_lat(x, z)],
            "rawCenterMeters": round(float(crop[row, column]), 3),
            "raw3x3": stats(crop[row_start:row_end, column_start:column_end].ravel()),
            "localP20Meters": round(float(local_p20[row, column]), 3),
        }

    analysis = {
        "source": {
            "dataset": "Copernicus DEM GLO-30 Public 2021 release",
            "kind": "DSM containing terrain, buildings and vegetation",
            "rawFile": str(arguments.dem),
            "resolutionArcSeconds": pixel_lon * 3600,
            "approximateResolutionMeters": round(pixel_lat * meters_per_lat_degree, 2),
            "notice": "produced using Copernicus WorldDEM-30 © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA; all rights reserved",
        },
        "xinhua": {
            "wgs84Bounds": {
                "west": west,
                "south": south,
                "east": east,
                "north": north,
            },
            "cropPixels": {
                "left": left,
                "top": top,
                "width": int(crop.shape[1]),
                "height": int(crop.shape[0]),
                "insideBoundary": int(mask.sum()),
            },
            "rawDsmMeters": stats(raw_values),
            "localP20FiveByFiveMeters": stats(filtered_values),
            "surfaceRoadRawMeters": stats(road_raw),
            "surfaceRoadLocalP20Meters": stats(road_filtered),
            "broadPlaneFromRoadLocalP20": {
                "model": {
                    "elevationMeters": "eastWestGrade * eastMeters + sceneZGrade * sceneZMeters + interceptMeters",
                    "eastWestGrade": round(float(coefficients[0]), 8),
                    "sceneZGrade": round(float(coefficients[1]), 8),
                    "interceptMeters": round(float(coefficients[2]), 6),
                },
                "eastWestGradePercent": round(float(coefficients[0] * 100), 5),
                "sceneZGradePercent": round(float(coefficients[1] * 100), 5),
                "fittedBoundaryRangeMeters": round(float(boundary_fitted.max() - boundary_fitted.min()), 3),
                "retainedSamples": int(keep.sum()),
                "totalSamples": int(keep.size),
                "retainedResidualRmseMeters": round(float(np.sqrt(np.mean(residuals[keep] ** 2))), 3),
            },
            "landmarks": landmark_samples,
        },
    }

    grid_values: list[list[float | None]] = []
    filtered_grid_values: list[list[float | None]] = []
    for row in range(crop.shape[0]):
        grid_values.append([
            round(float(crop[row, column]), 3) if mask[row, column] else None
            for column in range(crop.shape[1])
        ])
        filtered_grid_values.append([
            round(float(local_p20[row, column]), 3) if mask[row, column] else None
            for column in range(crop.shape[1])
        ])

    grid = {
        "source": analysis["source"],
        "georeference": {
            "crs": "EPSG:4326",
            "originPixelCenter": [
                origin_lon + left * pixel_lon,
                origin_lat - top * pixel_lat,
            ],
            "pixelStep": [pixel_lon, -pixel_lat],
            "width": int(crop.shape[1]),
            "height": int(crop.shape[0]),
        },
        "rawDsmMeters": grid_values,
        "localP20FiveByFiveMeters": filtered_grid_values,
    }

    arguments.analysis_output.parent.mkdir(parents=True, exist_ok=True)
    with arguments.analysis_output.open("x") as handle:
        json.dump(analysis, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    with arguments.grid_output.open("x") as handle:
        json.dump(grid, handle, ensure_ascii=False, separators=(",", ":"))
        handle.write("\n")

    print(json.dumps(analysis, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
