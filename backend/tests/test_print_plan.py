import pytest

from app.pipeline.blender.print_plan import AUTO_FIT, OVERRIDE, estimate_print_hours, plan_scale


def test_scales_to_requested_max_dimension_when_it_fits():
    plan = plan_scale(
        current_max_dim=50.0, target_max_dimension_mm=100.0, scale_percent=100,
        fit_mode=AUTO_FIT, build_volume_mm=180.0,
    )
    assert plan.factor == pytest.approx(2.0)
    assert plan.scaled_to_fit is False
    assert plan.warnings == ()


def test_user_scale_percent_applies_on_top_of_target_size():
    plan = plan_scale(50.0, 100.0, 50, AUTO_FIT, 180.0)
    assert plan.factor == pytest.approx(1.0)
    assert plan.scaled_to_fit is False


def test_auto_fit_scales_down_and_warns_when_exceeding_build_volume():
    plan = plan_scale(50.0, 100.0, 200, AUTO_FIT, 180.0)
    assert plan.scaled_to_fit is True
    assert plan.factor * 50.0 <= 180.0
    assert len(plan.warnings) == 1
    assert "scaled down" in plan.warnings[0]


def test_override_keeps_size_and_warns():
    plan = plan_scale(50.0, 100.0, 200, OVERRIDE, 180.0)
    assert plan.factor == pytest.approx(4.0)
    assert plan.scaled_to_fit is False
    assert "not scaled" in plan.warnings[0]


def test_rejects_zero_extent():
    with pytest.raises(ValueError):
        plan_scale(0.0, 100.0, 100, AUTO_FIT, 180.0)


def test_print_time_estimate_uses_rate():
    assert estimate_print_hours(45.2, 6.6) == pytest.approx(6.85, abs=0.01)
