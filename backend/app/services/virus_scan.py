from io import BytesIO

import clamd

from app.config import get_settings


class VirusDetectedError(Exception):
    pass


class ScannerUnavailableError(Exception):
    pass


def scan_bytes(data: bytes) -> None:
    settings = get_settings()
    if not settings.clamav_enabled:
        return
    client = clamd.ClamdNetworkSocket(host=settings.clamav_host, port=settings.clamav_port, timeout=60)
    try:
        status, signature = client.instream(BytesIO(data))["stream"]
    except OSError as exc:
        raise ScannerUnavailableError("Virus scanner is unavailable") from exc
    if status == "FOUND":
        raise VirusDetectedError(f"Upload rejected: malware signature {signature}")
