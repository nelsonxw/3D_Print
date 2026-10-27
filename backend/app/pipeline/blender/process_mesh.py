"""Headless Blender mesh cleanup, printability checks and export.

Usage: blender -b --factory-startup -P process_mesh.py -- <config.json>
The config keys are produced by app.pipeline.blender.cleanup.
"""

import json
import os
import sys

import bmesh
import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from print_plan import ScalePlan, estimate_print_hours, plan_scale  # noqa: E402

WELD_DISTANCE = 1e-6


def load_config() -> dict:
    with open(sys.argv[sys.argv.index("--") + 1], encoding="utf-8") as handle:
        return json.load(handle)


def import_mesh(path: str) -> bpy.types.Object:
    bpy.ops.object.select_all(action="DESELECT")
    bpy.ops.wm.ply_import(filepath=path)
    obj = bpy.context.selected_objects[0]
    bpy.context.view_layer.objects.active = obj
    return obj


def decimate_if_needed(obj: bpy.types.Object, max_faces: int) -> None:
    face_count = len(obj.data.polygons)
    if face_count <= max_faces:
        return
    modifier = obj.modifiers.new("Decimate", "DECIMATE")
    modifier.ratio = max_faces / face_count
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.ops.object.modifier_apply(modifier=modifier.name)


def bounds(bm: bmesh.types.BMesh) -> tuple[Vector, Vector]:
    coords = [vert.co for vert in bm.verts]
    low = Vector(tuple(min(c[axis] for c in coords) for axis in range(3)))
    high = Vector(tuple(max(c[axis] for c in coords) for axis in range(3)))
    return low, high


def count_boundary_edges(bm: bmesh.types.BMesh) -> int:
    return sum(1 for edge in bm.edges if edge.is_boundary)


def count_non_manifold_edges(bm: bmesh.types.BMesh) -> int:
    return sum(1 for edge in bm.edges if len(edge.link_faces) > 2)


def repair_mesh(bm: bmesh.types.BMesh) -> dict:
    vertex_count_before = len(bm.verts)
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=WELD_DISTANCE)
    duplicates_removed = vertex_count_before - len(bm.verts)

    bmesh.ops.dissolve_degenerate(bm, dist=WELD_DISTANCE, edges=bm.edges[:])

    normals_before = [face.normal.copy() for face in bm.faces]
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.normal_update()
    flipped_normals = sum(1 for face, before in zip(bm.faces, normals_before) if face.normal.dot(before) < 0)

    boundary_edges = [edge for edge in bm.edges if edge.is_boundary]
    if boundary_edges:
        bmesh.ops.holes_fill(bm, edges=boundary_edges, sides=0)

    bmesh.ops.triangulate(bm, faces=bm.faces[:])
    return {
        "duplicate_vertices_removed": duplicates_removed,
        "flipped_normals_fixed": flipped_normals,
        "boundary_edges_filled": len(boundary_edges),
    }


def place_on_bed(bm: bmesh.types.BMesh, factor: float) -> None:
    for vert in bm.verts:
        vert.co *= factor
    low, high = bounds(bm)
    offset = Vector(((low.x + high.x) / 2, (low.y + high.y) / 2, low.z))
    for vert in bm.verts:
        vert.co -= offset


def export_all(obj: bpy.types.Object, output_dir: str) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.wm.stl_export(filepath=os.path.join(output_dir, "model.stl"), export_selected_objects=True)
    bpy.ops.wm.obj_export(filepath=os.path.join(output_dir, "model.obj"), export_selected_objects=True)
    bpy.ops.wm.ply_export(filepath=os.path.join(output_dir, "model.ply"), export_selected_objects=True)


def build_report(bm: bmesh.types.BMesh, repairs: dict, plan: ScalePlan, config: dict) -> dict:
    low, high = bounds(bm)
    volume_cm3 = bm.calc_volume(signed=False) / 1000.0
    watertight = count_boundary_edges(bm) == 0 and count_non_manifold_edges(bm) == 0
    warnings = list(plan.warnings)
    if not watertight:
        warnings.append("Mesh is not fully watertight after automatic repair; slicer may need manual fixes.")
    return {
        "watertight": watertight,
        "non_manifold_edges": count_non_manifold_edges(bm),
        "boundary_edges": count_boundary_edges(bm),
        **repairs,
        "estimated_volume_cm3": round(volume_cm3, 2),
        "estimated_print_time_hours": estimate_print_hours(volume_cm3, config["print_rate_cm3_per_hour"]),
        "dimensions_mm": [round(d, 2) for d in (high - low)],
        "build_volume_mm": config["build_volume_mm"],
        "scale_factor": round(plan.factor, 5),
        "scaled_to_fit": plan.scaled_to_fit,
        "triangle_count": len(bm.faces),
        "vertex_count": len(bm.verts),
        "warnings": warnings,
    }


def main() -> None:
    config = load_config()
    obj = import_mesh(config["input_ply"])
    decimate_if_needed(obj, config["max_faces"])

    bm = bmesh.new()
    bm.from_mesh(obj.data)
    repairs = repair_mesh(bm)

    low, high = bounds(bm)
    plan = plan_scale(
        current_max_dim=max(high - low),
        target_max_dimension_mm=config["target_max_dimension_mm"],
        scale_percent=config["scale_percent"],
        fit_mode=config["fit_mode"],
        build_volume_mm=config["build_volume_mm"],
    )
    place_on_bed(bm, plan.factor)
    report = build_report(bm, repairs, plan, config)

    bm.to_mesh(obj.data)
    bm.free()
    export_all(obj, config["output_dir"])
    with open(os.path.join(config["output_dir"], "report.json"), "w", encoding="utf-8") as handle:
        json.dump(report, handle, indent=2)


if __name__ == "__main__":
    main()
