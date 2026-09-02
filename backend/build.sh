#!/bin/bash
set -e

echo "=== Limpando HTMLs e assets antigos ==="
find ../frontend/public -name "*.html" -delete 2>/dev/null || true
rm -rf ../frontend/public/_next 2>/dev/null || true

echo "=== Build do Next.js ==="
cd ../frontend
npm ci
npm run build
cd ../backend

echo "=== Copiando HTML gerado para Flask ==="
cp -r ../frontend/out/* ../frontend/public/

echo "=== Build concluido ==="
