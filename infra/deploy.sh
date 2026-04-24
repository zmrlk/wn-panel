#!/usr/bin/env bash
# wn-panel redeploy na VM 142 (po commit+push do main).
# Prerequisites:
#  - VPN do VAVO aktywny (ping 192.168.3.226)
#  - ~/.ssh/config ma alias wolny-namiot-app (ProxyJump pve)
#  - ~/.secrets/wolny-namiot/app.env wypełniony (KC secret, RESEND, TUNNEL_TOKEN)
#  - GH Actions build zakończony success (ghcr.io/zmrlk/wn-panel:latest ready)
#
# Usage: bash infra/deploy.sh

set -euo pipefail

SECRETS="$HOME/.secrets/wolny-namiot"
VM="wolny-namiot-app"

echo "▶ Preflight: VPN + SSH"
if ! ping -c 1 -W 2 192.168.3.226 >/dev/null 2>&1; then
  echo "❌ Proxmox 192.168.3.226 nieosiągalny. Włącz VPN."; exit 1
fi
if ! ssh -o ConnectTimeout=5 -o BatchMode=yes "$VM" "hostname" >/dev/null 2>&1; then
  echo "❌ SSH do $VM failed."; exit 1
fi
echo "✅ Network OK"

echo "▶ Sprawdzam build status"
LATEST=$(gh run list --repo zmrlk/wn-panel --limit 1 --json status,conclusion 2>/dev/null | jq -r '.[0]')
STATUS=$(echo "$LATEST" | jq -r '.status')
CONCLUSION=$(echo "$LATEST" | jq -r '.conclusion')
if [ "$STATUS" != "completed" ] || [ "$CONCLUSION" != "success" ]; then
  echo "⚠ Build: status=$STATUS conclusion=$CONCLUSION — kontynuować? (y/N)"
  read -r ANS
  [ "$ANS" != "y" ] && exit 1
fi
echo "✅ Image gotowy"

echo "▶ Kopiuję compose + env"
ssh "$VM" "sudo mkdir -p /opt/wn-app && sudo chown ubuntu:ubuntu /opt/wn-app"
scp "$(dirname "$0")/docker-compose.yml" "$VM:/opt/wn-app/docker-compose.yml"
scp "$SECRETS/app.env" "$VM:/opt/wn-app/.env"
ssh "$VM" "chmod 600 /opt/wn-app/.env"
echo "✅ Files on VM"

echo "▶ Pull image + up -d"
ssh "$VM" "cd /opt/wn-app && sudo docker compose pull && sudo docker compose up -d"

echo "▶ Waiting for healthy..."
for i in $(seq 1 30); do
  HEALTH=$(ssh "$VM" "sudo docker inspect --format='{{.State.Health.Status}}' wn-app 2>/dev/null" || echo "starting")
  if [ "$HEALTH" = "healthy" ]; then
    echo "✅ Container healthy after ${i}x2s"; break
  fi
  sleep 2
done

echo "▶ Smoke test"
ssh "$VM" "curl -sS http://192.168.3.142:3000/api/health"
echo ""

echo "▶ Logs (ostatnie 20 linii app + tunnel)"
ssh "$VM" "sudo docker logs --tail=20 wn-app 2>&1; echo '---'; sudo docker logs --tail=10 wn-tunnel 2>&1"

echo ""
echo "Deploy done. Panel: https://panel.wolnynamiot.pl (lub http://192.168.3.142:3000 via LAN)"
