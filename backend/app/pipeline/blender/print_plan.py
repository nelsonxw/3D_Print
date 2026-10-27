from dataclasses import dataclass

FIT_MARGIN = 0.98
AUTO_FIT = "auto_fit"
OVERRIDE = "override"


@dataclass(frozen=True)
class ScalePlan:
    factor: float
    scaled_to_fit: bool
    warnings: tuple[str, ...]


def plan_scale(
    current_max_dim: float,
    target_max_dimension_mm: float,
    scale_percent: float,
    fit_mode: str,
    build_volume_mm: float,
) -> ScalePlan:
    if current_max_dim <= 0:
        raise ValueError("Reconstructed mesh has no extent")

    factor = target_max_dimension_mm * (scale_percent / 100) / current_max_dim
    final_max_dim = factor * current_max_dim
    if final_max_dim <= build_volume_mm:
        return ScalePlan(factor, False, ())

    if fit_mode == AUTO_FIT:
        fitted_factor = build_volume_mm * FIT_MARGIN / current_max_dim
        warning = (
            f"Model was {final_max_dim:.0f} mm and was scaled down to fit the "
            f"{build_volume_mm:g} mm build volume (auto-fit)."
        )
        return ScalePlan(fitted_factor, True, (warning,))

    warning = (
        f"Model is {final_max_dim:.0f} mm, larger than the {build_volume_mm:g} mm build volume. "
        "Override is active, so it was not scaled and may not fit on the printer."
    )
    return ScalePlan(factor, False, (warning,))


def estimate_print_hours(volume_cm3: float, rate_cm3_per_hour: float) -> float:
    return round(volume_cm3 / rate_cm3_per_hour, 2)
