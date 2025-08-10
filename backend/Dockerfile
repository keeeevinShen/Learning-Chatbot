
##############
# Builder stage
##############
FROM python:3.11-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install build dependencies for wheels (cleaned after)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy and install dependencies first for better caching
COPY ./requirements.txt /app/requirements.txt
RUN pip wheel --wheel-dir /wheels -r requirements.txt

##############
# Runtime stage
##############
FROM python:3.11-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Create non-root user and group
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser

# Install runtime dependencies from prebuilt wheels
COPY --from=builder /wheels /wheels
RUN pip install --no-cache-dir --no-index --find-links=/wheels /wheels/* && rm -rf /wheels

# Install Playwright Chromium and its OS dependencies for lecture transcript scraping
RUN python -m playwright install --with-deps chromium

# Copy application code after deps to leverage layer caching
COPY . /app

# Adjust permissions
RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--forwarded-allow-ips=*"]

