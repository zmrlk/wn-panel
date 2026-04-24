# Keycloak realm `wolny_namiot` — setup checklist

KC instance: https://auth.vavolabs.pl (shared, realm `wolny_namiot` tylko dla wn-panel).

## 1. Realm

- [ ] Name: `wolny_namiot`
- [ ] Enabled: ON

## 2. Client `wn-panel-app`

- [ ] Client type: **OpenID Connect**
- [ ] Client authentication: **ON** (Confidential)
- [ ] Standard flow: **ON**
- [ ] Direct access grants: OFF
- [ ] Service accounts: OFF

### Valid Redirect URIs

- `https://panel.wolnynamiot.pl/auth/callback`
- `https://panel.wolnynamiot.pl/*` (po logout)
- `http://192.168.3.142:3000/auth/callback` (LAN fallback)
- `http://192.168.3.142:3000/*`
- `http://localhost:5173/auth/callback` (dev)

### Web Origins

- `+` (wildcard zgodny z redirect URIs) lub explicit lista jak wyżej

### Credentials

Tab Credentials → Client Authenticator = Client Id and Secret → skopiuj Secret do `app.env` jako `KEYCLOAK_CLIENT_SECRET`.

## 3. Realm roles

- [ ] `admin` — pełen dostęp do panelu (layout switcher, settings, send offer, etc.)
- [ ] `employee` — ograniczony: widok assigned bookings (employeeView dashboard)

## 4. Users

Min. 1 admin user:
- [ ] Username: `karol` (lub email)
- [ ] Email + Email verified: ON
- [ ] First name / Last name: wypełnione
- [ ] Credentials → ustawione hasło (temp OK, wymuszenie reset przy pierwszym logowaniu)
- [ ] Role mapping → Realm roles → `admin`

## 5. Automation przez kcadm (alternative)

Wymaga KC master admin creds (z env container `keycloak` na VM 132: `KEYCLOAK_ADMIN` + `KEYCLOAK_ADMIN_PASSWORD`).

```bash
# Przez Proxmox qemu-guest-agent + docker exec (nie wystawia KC na zewnątrz):
ssh pve "qm guest exec 132 -- bash -c 'sudo docker exec keycloak /opt/keycloak/bin/kcadm.sh config credentials \
  --server http://localhost:8080 --realm master --user admin --password <PASS>'"
```

Potem `kcadm.sh create/update` dla realm/client/user.

## 6. Typowe błędy

| Objaw | Przyczyna | Fix |
|---|---|---|
| `Invalid parameter: redirect_uri` | URL nie w Valid Redirect URIs | dodaj; uważaj na http vs https |
| `invalid_redirect_uri` w KC log, protocol mismatch | app generuje https, browser HSTS upgrade | app: zweryfikuj ORIGIN env / PROTOCOL_HEADER; user: ręczny http:// |
| `Invalid OAuth state` (400 w callback) | cookie `kc_state` nie wraca — Secure na HTTP | `secure: url.protocol === 'https:'` w `cookies.set()` |
| `Token exchange failed 401/502` | client_secret mismatch | sprawdź `KEYCLOAK_CLIENT_SECRET` vs KC credentials tab |
| Login OK, ale 403 na dashboard | brak role `admin`/`employee` | KC → Users → role mappings |
