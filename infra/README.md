# wn-panel infra

Deploy stack na Proxmox `vavo` (192.168.3.226). Dwie VMy.

## Topologia

```
192.168.3.226 (pve)
 ├── VM 142 wolny-namiot-app  (2C/4GB/40GB, ubuntu 24.04)
 │    ├── 192.168.3.142  (LAN)
 │    ├── 10.10.0.42    (internal vmbr1 → db VM)
 │    └── docker: wn-app + wn-tunnel (cloudflared)
 │
 └── VM 143 wolny-namiot-db   (2C/4GB/80GB, ubuntu 24.04)
      ├── 192.168.3.143  (LAN)
      ├── 10.10.0.43    (internal vmbr1)
      └── docker: wn-pg (postgres:16-alpine)
```

## Deploy flow (od zera)

1. Provision VMy z template 9000 (`qm clone 9000 142 --name wolny-namiot-app`)
2. Docker install na obu: `curl -fsSL https://get.docker.com | sh`
3. `/opt/wn-db/` + `/opt/wn-app/` + env files z template (patrz niżej)
4. `docker compose -f docker-compose-db.yml up -d` na VM 143
5. Aplikuj migracje drizzle (lokalnie: `DATABASE_URL=... npx drizzle-kit push`)
6. `docker compose -f docker-compose.yml up -d` na VM 142
7. Keycloak client `wn-panel-app` w realm `wolny_namiot` (checklist: `KC-REALM-CHECKLIST.md`)
8. Cloudflare Tunnel (skrypt automatyzacji w `~/.secrets/wolny-namiot/cf-tunnel-create.sh`)

Update po nowym commicie: `bash ~/.secrets/wolny-namiot/deploy.sh` (GHCR image pull + recreate).

## Pliki

| file | gdzie |
|---|---|
| `docker-compose.yml` | `/opt/wn-app/docker-compose.yml` (VM 142) |
| `docker-compose-db.yml` | `/opt/wn-db/docker-compose.yml` (VM 143) |
| `app.env.example` | template → `/opt/wn-app/.env` (sekrety wypełnij z `~/.secrets/wolny-namiot/`) |
| `db.env.example` | template → `/opt/wn-db/.env` |
| `KC-REALM-CHECKLIST.md` | ręczne kroki w KC admin UI |
| `deploy.sh` | one-shot redeploy po push |

## Secrets

Nigdy w repo. Trzymane lokalnie w `~/.secrets/wolny-namiot/`:
- `app.env` (runtime env, wszystkie sekrety)
- `db-creds.env` (password)
- `kc-creds.env` (client_id + secret)
- `cf-api-token.txt` (Cloudflare API)
- `cf-tunnel-token.txt` (cloudflared connector token)
- `backups/*.sql.gz` (pg_dump snapshots)

## Auth flow

```
Browser → panel.wolnynamiot.pl (CF Tunnel) → wn-app
   → 303 /auth/login
   → 302 auth.vavolabs.pl/realms/wolny_namiot/... (KC login)
   → callback: /auth/callback?code=...
   → kc_access + kc_refresh cookies
   → /dashboard
```

KC = shared instance (realm per-projekt) na VM 132 `vrs-auth`.

## Backups

Manual: `ssh wolny-namiot-db "sudo docker exec wn-pg pg_dump -U wn wn_panel" | gzip > backup.sql.gz`

Automated: cron w `~/.bos/crons/` (setup w bOS — TBD).
