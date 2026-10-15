FROM python:3.12-slim

WORKDIR /app

# System deps for health checks and native extensions, plus the Debian
# security fixes published since the base image.
RUN apt-get update && apt-get upgrade -y \
    && apt-get install -y --no-install-recommends curl build-essential \
    && rm -rf /var/lib/apt/lists/*

# CPU-only PyTorch first (avoids downloading ~6GB of CUDA libs), and before
# copying requirements.txt: editing the requirements must not re-download it.
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install torch --index-url https://download.pytorch.org/whl/cpu

COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt

COPY . .

# Unprivileged user; the entrypoint fixes volume ownership, then drops root.
# The entrypoint is normalised to LF: a Windows checkout turns it into CRLF,
# which /bin/sh cannot run.
RUN useradd --create-home --uid 10001 app \
    && chown -R app:app /app \
    && sed -i 's/\r$//' /app/docker-entrypoint.sh \
    && install -m 755 /app/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

EXPOSE 8086

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -f http://localhost:8086/ai/health || exit 1

# Database migrations (Alembic) run at application startup.
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8086"]
