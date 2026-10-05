import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from .config import DEV_SECRET, get_settings
from .db import engine
from .routers import admin, auth, content, mail, portal, public, staff

settings = get_settings()
logging.basicConfig(level=logging.INFO)
if settings.is_production and settings.secret_key == DEV_SECRET:
    raise RuntimeError("SECRET_KEY must be set in production.")


@asynccontextmanager
async def lifespan(_: FastAPI):
    for sub in ("public", "private"):
        try:
            (Path(settings.upload_dir) / sub).mkdir(parents=True, exist_ok=True)
        except PermissionError:
            # Railway volumes mount as root: set RAILWAY_RUN_UID=0 on the service
            logging.getLogger("verdescope").error("Upload dir %s is not writable; uploads will fail.", settings.upload_dir)
    yield


app = FastAPI(
    title="Verde-Scope Africa API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url=None if settings.is_production else "/api/docs",
    redoc_url=None,
    openapi_url=None if settings.is_production else "/api/openapi.json",
)
app.add_middleware(GZipMiddleware, minimum_size=1000)
if not settings.is_production:
    app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

for r in (public.router, auth.router, content.router, mail.router, admin.router, portal.router, staff.router):
    app.include_router(r, prefix="/api")


@app.get("/api/health", tags=["meta"])
def health():
    with engine.connect() as c:
        c.execute(text("select 1"))
    return {"status": "ok"}


@app.api_route("/api/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"], include_in_schema=False)
def api_404(path: str):
    raise HTTPException(404, "Not found")


# User uploads (images/videos). Private documents live outside this mount.
app.mount("/uploads", StaticFiles(directory=Path(settings.upload_dir) / "public", check_dir=False), name="uploads")

# ---------- React PWA ----------
STATIC = Path(settings.static_dir)
NO_CACHE = {"Cache-Control": "no-cache"}


@app.get("/{full_path:path}", include_in_schema=False)
def spa(full_path: str, request: Request):
    if not STATIC.is_dir():
        return JSONResponse({"detail": "Frontend not built. Run `npm run build` in /frontend or use the Vite dev server."}, 404)
    target = (STATIC / full_path).resolve()
    if full_path and target.is_file() and STATIC.resolve() in target.parents:
        name = target.name
        if name in ("sw.js", "registerSW.js", "manifest.webmanifest") or name.startswith("workbox-"):
            return FileResponse(target, headers=NO_CACHE)
        hashed = full_path.startswith("assets/") and "-" in name and target.suffix in (".js", ".css")
        return FileResponse(target, headers={"Cache-Control": "public, max-age=31536000, immutable"} if hashed else {"Cache-Control": "public, max-age=86400"})
    return FileResponse(STATIC / "index.html", headers=NO_CACHE)
