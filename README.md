# ServerHub

Self-hosted web panel to manage an Ubuntu VPS from the browser: Python project
workspaces, Streamlit dashboards, script running/scheduling, websites, MySQL,
nginx, terminal, logs, file manager and a built-in code editor.

**Status: complete (all phases).** Auth, project workspaces, file uploads,
Monaco editor, script runner with live WebSocket output, Streamlit dashboards
via Supervisor, dashboard cards + server stats, **plus**: in-browser PTY
terminal (xterm.js), full live log viewer, APScheduler cron scheduling with a
visual builder, website deploys (zip + React build), nginx config generation
with domain assignment + Certbot SSL, global file manager, MySQL manager
(create/drop/query/import/export), APT package manager with live install
output, live CPU/RAM/disk graphs, supervisor process control, and a settings
page (password / config / DB backup).

## Install (one command)

On a fresh **Ubuntu 22.04+** server:

```bash
curl -fsSL https://raw.githubusercontent.com/alihamza0053/ubuntu-panel/main/deploy/get.sh | sudo bash
```

That's the whole install. It clones the source to `/opt/serverhub-src` and runs
[`deploy/install.sh`](deploy/install.sh), which installs every dependency —
nginx, supervisor, MySQL, PHP, Certbot, Google Chrome, Node, the Python venv and
all pip packages — and builds the frontend. It's idempotent: **re-run the same
command later to update the panel in place.**

When it finishes it prints the exact commands to create your admin user.

**No domain needed** — the panel answers on the server's IP straight away:
`http://YOUR_SERVER_IP`. Adding a domain later gets you free HTTPS via Certbot.
See [DEPLOYMENT.md § 5.0](DEPLOYMENT.md#50--no-domain-run-on-the-ip-address)
for IP-only access, including how to avoid sending your password in cleartext
before HTTPS is set up.

> Prefer not to pipe the internet into a root shell unseen? Read it first:
> `curl -fsSL .../deploy/get.sh -o get.sh; less get.sh; sudo bash get.sh`

Already have a clone? `sudo bash deploy/install.sh` does the same thing.

## Guides

- **`DEPLOYMENT.md`** — install from zero on a fresh Ubuntu VPS (every dependency).
- **`UPDATING.md`** — push code changes to an installed panel (`deploy/update.sh`).
- **`DASHBOARD_GUIDE.md`** — deploy Streamlit dashboards + fix every common issue
  (per-project venv, spawn errors, `.xls`/`xlrd`, missing modules).
- **`SCRIPTS_GUIDE.md`** — run Python/Selenium scripts (headless Chrome, scheduling).
- **`CUSTOM_APPS.md`** — run your own FastAPI/Flask/Node/Docker app behind a
  domain with SSL (Proxies).

## Stack

- **Backend** — FastAPI + SQLite (SQLAlchemy), JWT auth (bcrypt), WebSockets,
  Supervisor for dashboard processes. `backend/`
- **Frontend** — React (Vite) + Tailwind, React Router, Axios, Monaco editor.
  `frontend/` (builds into `backend/static/`)
- **Deploy** — Nginx reverse proxy + Supervisor on Ubuntu. `deploy/`

## Quick start (development)

Backend (terminal 1):

```bash
cd backend
python3 -m venv venv && source venv/bin/activate     # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                                  # edit SECRET_KEY at least
python setup_admin.py -u admin                        # prompts for password
uvicorn app.main:app --reload --port 8765
```

Frontend (terminal 2):

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173 — proxies /api and /ws to :8765
```

Note: Supervisor/Streamlit features need Linux. On Windows/macOS dev machines
everything else works; dashboard start/stop will report supervisor errors.

## Production install (from a clone)

```bash
sudo bash deploy/install.sh
```

The script installs packages, creates the `serverhub` system user, builds the
frontend, registers the panel under Supervisor on port 8765, configures nginx
and installs a restricted sudoers rule (`supervisorctl` only in Phase 1).

Afterwards:

1. `cd /srv/serverhub/backend && sudo -u serverhub /srv/serverhub/venv/bin/python setup_admin.py`
2. Set your domain in `/etc/nginx/sites-available/serverhub`, reload nginx.
3. `sudo certbot --nginx -d panel.yourdomain.com` for SSL.

## Layout on the VPS

```
/srv/serverhub/            panel (backend, frontend, venv, db, supervisor.d)
/srv/projects/<name>/      workspaces: code/ allscripts/ data/ dashboard/ logs/
/srv/websites/             deployed sites (Phase 3)
/srv/nginx-configs/        panel-generated nginx blocks (Phase 3)
```

Each project gets a Supervisor program `<name>_dashboard` running
`streamlit run dashboard/app.py --server.port <port>` with auto-restart.
Configs live in `/srv/serverhub/supervisor.d/` (included from
`supervisord.conf`) so the panel user can write them without root; only
`supervisorctl` goes through sudo.

## Security model

- Single admin user; JWT (bcrypt-hashed password) on every API route, token
  as `?token=` on WebSockets; login rate-limited per IP.
- All subprocess calls use argument lists — never `shell=True`.
- Uploads validated by per-folder extension allow-lists; filenames sanitized.
- All file paths resolved and confined to panel-managed roots
  (`backend/app/services/paths.py`).
- Sudo restricted to specific commands via `/etc/sudoers.d/serverhub`.

## Implemented (all phases)

- **Phase 1** — auth/JWT, project CRUD + folders, uploads, Monaco editor, script
  runner with live logs, Streamlit dashboards via Supervisor, dashboard cards.
- **Phase 2** — browser PTY terminal (xterm.js), full live log viewer with
  search/download, APScheduler scheduling + visual cron builder.
- **Phase 3** — website deploys (zip + React build), nginx config generation,
  domain assignment + Certbot SSL, global file manager.
- **Phase 4** — MySQL manager, APT package manager with live output, live server
  graphs, supervisor process control.
- **Phase 5** — settings page (password / config / DB backup), responsive layout.

## License

MIT — see [LICENSE](LICENSE).

Third-party components are listed in
[THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md). The only bundled one is
[SheetJS](https://sheetjs.com) (Apache-2.0), self-hosted at
`frontend/public/vendor/` to power the in-browser spreadsheet viewer.
