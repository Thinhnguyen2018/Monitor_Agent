# ── Stage 1: Build React frontend ────────────────────────────────
FROM node:20-alpine AS frontend-build

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ── Stage 2: Runtime (nginx + FastAPI) ───────────────────────────
FROM python:3.11-slim

# Install nginx and supervisor
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx supervisor && \
    rm -rf /var/lib/apt/lists/*

# Install Python deps
WORKDIR /app/backend
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt uvicorn[standard]

COPY backend/ .

# Copy built frontend into nginx html dir
COPY --from=frontend-build /app/frontend/dist /usr/share/nginx/html

# nginx config: serve static files, proxy /api → uvicorn
COPY nginx.conf /etc/nginx/sites-available/default

# supervisor config: run both nginx and uvicorn
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

EXPOSE 8080

CMD ["supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
