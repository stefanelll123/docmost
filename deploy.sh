#!/usr/bin/env sh
set -eu

# Image settings
REPO="stefanelll123/docmost"
DOCKERFILE="${DOCKERFILE:-Dockerfile}"
CONTEXT_DIR="${CONTEXT_DIR:-.}"

# Tag logic:
# 1) If TAG env var is set, use it.
# 2) Else, try git short SHA.
# 3) Else, fallback to timestamp.
if [ "${TAG:-}" != "" ]; then
  TAG_VALUE="$TAG"
elif command -v git >/dev/null 2>&1 && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  TAG_VALUE="$(git rev-parse --short HEAD)"
else
  TAG_VALUE="$(date +%Y%m%d%H%M%S)"
fi

IMAGE_VERSIONED="${REPO}:${TAG_VALUE}"
IMAGE_LATEST="${REPO}:latest"

PLATFORM="${PLATFORM:-linux/amd64}"

echo "==> Building ${IMAGE_VERSIONED} for ${PLATFORM} (and tagging ${IMAGE_LATEST})"
docker buildx build \
  --platform "${PLATFORM}" \
  --load \
  -f "${DOCKERFILE}" \
  -t "${IMAGE_VERSIONED}" \
  -t "${IMAGE_LATEST}" \
  "${CONTEXT_DIR}"

# Ensure we are logged in (won't prompt if already logged in)
echo "==> Checking Docker Hub login"
if ! docker info 2>/dev/null | grep -q "Username:"; then
  echo "You are not logged in. Running: docker login"
  docker login
fi

echo "==> Pushing ${IMAGE_VERSIONED}"
docker push "${IMAGE_VERSIONED}"

echo "==> Pushing ${IMAGE_LATEST}"
docker push "${IMAGE_LATEST}"

echo "✅ Done!"
echo "Published:"
echo "  - ${IMAGE_VERSIONED}"
echo "  - ${IMAGE_LATEST}"