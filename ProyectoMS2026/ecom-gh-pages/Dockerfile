FROM python:3.12-slim

WORKDIR /docs

RUN pip install --no-cache-dir mkdocs mkdocs-material pymdown-extensions

EXPOSE 8000

# CMD ["mkdocs", "serve", "-a", "0.0.0.0:8000"]


# Build (generar sitio final)
# docker compose run --rm mkdocs mkdocs build
