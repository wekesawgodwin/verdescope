# syntax=docker/dockerfile:1.7
# ---------- 1. Build the React PWA ----------
FROM node:20-alpine AS web
WORKDIR /web
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
ARG VITE_SHOW_DEMO_LOGINS=false
ENV VITE_SHOW_DEMO_LOGINS=$VITE_SHOW_DEMO_LOGINS
RUN npm run build

# ---------- 2. FastAPI runtime ----------
FROM python:3.12-slim AS app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    ENVIRONMENT=production \
    STATIC_DIR=/app/static \
    UPLOAD_DIR=/data/uploads \
    PORT=8000
WORKDIR /app
COPY backend/requirements.txt ./
RUN pip install -r requirements.txt
COPY backend/ ./
COPY --from=web /web/dist ./static
RUN useradd --create-home --uid 10001 app \
 && mkdir -p /data/uploads && chown -R app:app /data /app \
 && chmod +x start.sh
USER app
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD python -c "import os,urllib.request; urllib.request.urlopen(f'http://127.0.0.1:{os.environ.get(\"PORT\",\"8000\")}/api/health', timeout=4)"
CMD ["./start.sh"]
