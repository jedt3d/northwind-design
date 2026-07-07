#!/usr/bin/env bash
# Deploy Northwind to the VPS. Run from the repo root on a machine with SSH access:
#   ./deploy/deploy.sh root@146.190.200.199
set -euo pipefail

HOST="${1:-root@146.190.200.199}"
PB_VERSION="0.39.5"
APP_DIR="/opt/northwind"

echo "==> Building frontend"
(cd frontend && npm ci --silent && npm run build --silent)
rm -rf backend/pb_public && cp -r frontend/dist backend/pb_public

echo "==> Preparing server"
ssh "$HOST" "set -e
  mkdir -p $APP_DIR
  if [ ! -x $APP_DIR/pocketbase ] || ! $APP_DIR/pocketbase --version | grep -q $PB_VERSION; then
    curl -fsSL https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip -o /tmp/pb.zip
    apt-get install -y unzip > /dev/null 2>&1 || true
    unzip -o -q /tmp/pb.zip pocketbase -d $APP_DIR
    chmod +x $APP_DIR/pocketbase
  fi"

echo "==> Uploading app files"
rsync -az --delete backend/pb_migrations backend/pb_hooks backend/pb_public "$HOST:$APP_DIR/"
rsync -az deploy/northwind.service "$HOST:/etc/systemd/system/northwind.service"
rsync -az deploy/nginx-northwind.conf "$HOST:/etc/nginx/sites-available/northwind.conf"

echo "==> Starting services"
ssh "$HOST" "set -e
  chown -R www-data:www-data $APP_DIR
  systemctl daemon-reload
  systemctl enable --now northwind
  systemctl restart northwind
  ln -sf /etc/nginx/sites-available/northwind.conf /etc/nginx/sites-enabled/northwind.conf
  nginx -t && systemctl reload nginx"

echo "==> Done. Check https://northwind.raawww.com"
