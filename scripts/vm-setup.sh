#!/usr/bin/env bash
# VM bootstrap script — run once on a fresh Oracle Cloud Ubuntu 24.04 ARM64 instance.
# Usage: bash vm-setup.sh
set -euo pipefail

REPO_URL="${REPO_URL:-}"   # set via: REPO_URL=https://github.com/... bash vm-setup.sh

echo "=== 1/5  System packages ==="
sudo apt-get update -q
sudo apt-get install -y -q \
  curl git ca-certificates gnupg ufw \
  netfilter-persistent iptables-persistent

echo "=== 2/5  Docker ==="
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker "$USER"
  echo "Docker installed. NOTE: log out and back in (or run 'newgrp docker') for group to take effect."
else
  echo "Docker already installed: $(docker --version)"
fi

echo "=== 3/5  Firewall ==="
# Oracle VMs ship with iptables rules blocking all non-SSH ports.
# These rules open 80 + 443 (TCP and UDP for HTTP/3).
sudo iptables -I INPUT 6 -p tcp --dport 80  -j ACCEPT
sudo iptables -I INPUT 6 -p tcp --dport 443 -j ACCEPT
sudo iptables -I INPUT 6 -p udp --dport 443 -j ACCEPT
sudo netfilter-persistent save
echo "Firewall rules saved."

echo "=== 4/5  Clone repo ==="
if [ -d "$HOME/app" ]; then
  echo "~/app already exists — pulling latest."
  git -C "$HOME/app" pull
else
  if [ -z "$REPO_URL" ]; then
    echo "REPO_URL not set. Clone manually:"
    echo "  git clone <your-repo-url> ~/app"
  else
    git clone "$REPO_URL" "$HOME/app"
    echo "Cloned to ~/app."
  fi
fi

echo "=== 5/5  Done ==="
echo ""
echo "Next steps:"
echo "  1. Copy your .env to ~/app/.env"
echo "     (from local machine: scp .env ubuntu@<vm-ip>:~/app/.env)"
echo "  2. Set DOMAIN and MANAGER_DOMAIN in ~/app/.env"
echo "  3. Point DNS: api.yourdomain.com and manager.yourdomain.com → $(curl -s ifconfig.me 2>/dev/null || echo '<vm-ip>')"
echo "  4. cd ~/app && docker compose up -d --build"
echo "  5. After first boot: docker compose exec medusa npx medusa exec src/migration-scripts/initial-data-seed.ts"
