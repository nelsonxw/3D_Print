import time

from fastapi import Request
from fastapi.responses import JSONResponse
from redis.asyncio import Redis
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response

EXEMPT_PATHS = {"/health", "/docs", "/openapi.json"}
WINDOW_SECONDS = 60


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, redis_url: str, limit_per_minute: int):
        super().__init__(app)
        self.redis = Redis.from_url(redis_url)
        self.limit = limit_per_minute

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        if request.method == "OPTIONS" or request.url.path in EXEMPT_PATHS:
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        window = int(time.time() // WINDOW_SECONDS)
        key = f"ratelimit:{client_ip}:{window}"
        count = await self.redis.incr(key)
        if count == 1:
            await self.redis.expire(key, WINDOW_SECONDS)
        if count > self.limit:
            return JSONResponse(
                {"detail": "Too many requests, please slow down"},
                status_code=429,
                headers={"Retry-After": str(WINDOW_SECONDS)},
            )
        return await call_next(request)
