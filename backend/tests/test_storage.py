import pytest

from app.config import get_settings
from app.services.storage import output_path


@pytest.fixture
def storage_root(tmp_path, monkeypatch):
    monkeypatch.setattr(get_settings(), "storage_root", tmp_path)
    return tmp_path


def test_output_path_stays_inside_job_directory(storage_root):
    path = output_path("job-1", "stl")
    assert path == (storage_root / "jobs" / "job-1" / "output" / "model.stl").resolve()


def test_output_path_rejects_unknown_format(storage_root):
    with pytest.raises(KeyError):
        output_path("job-1", "exe")
