# Build stage: the compilers for native extensions stay here. The final image
# only receives /usr/local (Python and its packages), so it carries no compiler
# and no kernel headers (linux-libc-dev), which Trivy flags at every kernel CVE.
FROM python:3.12-slim AS build

RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential \
    && rm -rf /var/lib/apt/lists/*

# CPU-only PyTorch first (avoids downloading ~6GB of CUDA libs), and before
# copying requirements.txt: editing the requirements must not re-download it.
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install torch==2.14.1 --index-url https://download.pytorch.org/whl/cpu

COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt

FROM python:3.12-slim

WORKDIR /app

# curl for the health check, plus the Debian security fixes published since
# the base image.
RUN apt-get update && apt-get upgrade -y \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Same base image in both stages: /usr/local is the base's Python plus the
# packages installed above.
COPY --from=build /usr/local /usr/local

COPY . .

# Unprivileged user; the entrypoint fixes volume ownership, then drops root.
# The entrypoint is normalised to LF: a Windows checkout turns it into CRLF,
# which /bin/sh cannot run.
RUN useradd --create-home --uid 10001 app \
    && install -d -o app -g app /home/app/.cache \
    && chown -R app:app /app \
    && sed -i 's/\r$//' /app/docker-entrypoint.sh \
    && install -m 755 /app/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

EXPOSE 8086

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -f http://localhost:8086/ai/health || exit 1

# Database migrations (Alembic) run at application startup.
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8086"]
