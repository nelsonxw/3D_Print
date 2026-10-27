import httpx

from app.config import get_settings
from app.pipeline.commands import ToolCommand
from app.pipeline.errors import PipelineError


def runner_url(runner: str) -> str:
    settings = get_settings()
    urls = {"colmap": settings.colmap_runner_url, "openmvs": settings.openmvs_runner_url}
    return urls[runner]


def run_tool(command: ToolCommand) -> None:
    timeout = get_settings().tool_timeout_seconds
    payload = {"binary": command.binary, "args": list(command.args), "timeout_seconds": timeout}
    try:
        response = httpx.post(f"{runner_url(command.runner)}/run", json=payload, timeout=timeout + 60)
    except httpx.HTTPError as exc:
        raise PipelineError(f"{command.binary} runner unreachable: {exc}") from exc
    if response.status_code != 200:
        raise PipelineError(f"{command.binary} request failed ({response.status_code}): {response.text[:500]}")
    result = response.json()
    if result["returncode"] != 0:
        raise PipelineError(f"{command.binary} exited with {result['returncode']}: {result['stderr_tail'][-800:]}")
