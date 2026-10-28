# ServerHub — Uninstalling the Panel Completely

This guide removes ServerHub from an Ubuntu server: the panel, everything it
deployed (dashboards, websites, Docker apps, nginx sites, SSL certificates), its
user, files and system hooks. Optionally it also removes the system packages
the installer added (nginx, MySQL, PHP, Node, Chrome, Docker, …).

> ⚠️ **This permanently deletes data.** Projects, websites, Docker app data
> (WordPress, Nextcloud, Supabase, …) and panel backups are all stored on this
> server. Do **step 0** first and copy the backup **off the server**.

Run every command as a sudo user. Paths assume the default install
(`/srv/serverhub`, source in `/opt/serverhub-src`).

---

## Quick: one command

```bash
sudo bash /opt/serverhub-src/deploy/uninstall.sh
```

No source checkout on the server any more? Run it straight from GitHub:

```bash
curl -fsSL https://raw.githubusercontent.com/alihamza0053/ubuntu-panel/main/deploy/uninstall.sh | sudo bash
```

It lists everything it will delete and only continues after you type
**`DELETE`**. Then it:

1. backs up the panel database, `.env`, panel backups, projects, websites and a
   dump of all MySQL databases to `/root/serverhub-final-backup-<date>/`
   (Docker volume data is **not** included — export it first, see step 0);
2. does steps 1–4, 6 and 7 below: stops the panel and its dashboards, removes
   Docker apps with their volumes, panel nginx sites and their SSL
   certificates, the sudo rules, the `serverhub`/`xfcedesk` users and all
   panel files.

It leaves alone anything other software may use: system packages, MySQL
databases, nginx sites the panel didn't create, ufw rules and Cloudflare
tunnels. Remove those by hand with steps 5, 8 and 9 if nothing else needs them.

Options: `--yes` skips the prompt, `--no-backup` skips the backup.

> Run it over **SSH or the server console**, not the panel's own Terminal page:
> the panel stops partway through, which would end that terminal session.

The steps below do the same thing by hand.

---

## What gets removed

| Area | Location |
|---|---|
| Panel code, venv, database, backups, trash, app data | `/srv/serverhub/` |
| Projects (scripts, dashboards, data) | `/srv/projects/` |
| Websites | `/srv/websites/` |
| Panel-generated nginx blocks | `/srv/nginx-configs/` + symlinks in `/etc/nginx/sites-enabled/` |
| OneDrive sync folder (if used) | `/srv/onedrive/` |
| Source checkout used by "Update now" | `/opt/serverhub-src/` |
| Panel nginx site | `/etc/nginx/sites-available/serverhub` |
| Supervisor program + include | `/etc/supervisor/conf.d/serverhub.conf`, line in `supervisord.conf` |
| Sudo rules | `/etc/sudoers.d/serverhub` |
| Docker apps | containers, compose projects and volumes named `app_*` |
| System users | `serverhub` (and `xfcedesk` if the XFCE Desktop app was installed) |
| Logs | `/var/log/supervisor/serverhub*.log`, `*_dashboard*.log`, `app_*.log` |

**Not removed unless you do step 9:** the shared system packages (nginx,
supervisor, MySQL, PHP, certbot, Node.js, Chrome, Docker). Other software on the
server may depend on them.

---

## 0. Back up anything you want to keep

```bash
STAMP=$(date +%Y%m%d-%H%M%S)
mkdir -p ~/serverhub-final-backup-$STAMP
cd ~/serverhub-final-backup-$STAMP

# Files: panel db/.env/backups, projects, websites
sudo tar czf serverhub-files.tgz \
  /srv/serverhub/db /srv/serverhub/backend/.env /srv/serverhub/backups \
  /srv/projects /srv/websites 2>/dev/null

# MySQL: every database (skip if MySQL isn't used)
sudo mysqldump --all-databases --single-transaction > mysql-all.sql

ls -lh
```

Docker app data lives in Docker volumes. To keep one, export it before step 2,
for example:

```bash
sudo docker volume ls --filter name=^app_
sudo docker run --rm -v app_nextcloud_data:/data -v "$PWD":/out alpine \
  tar czf /out/app_nextcloud_data.tgz -C /data .
```

Then copy the backup folder to your own computer (from your computer):

```bash
scp -r user@YOUR_SERVER_IP:~/serverhub-final-backup-* .
```

---

## 1. Stop the panel and everything it supervises

```bash
# Remove the panel program and the include of panel-managed programs
sudo rm -f /etc/supervisor/conf.d/serverhub.conf
sudo sed -i 's| /srv/serverhub/supervisor.d/\*.conf||' /etc/supervisor/supervisord.conf

# Supervisor stops and forgets every program whose config is gone:
# the panel, project dashboards (<name>_dashboard) and service apps (app_*)
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl status          # nothing ServerHub-related should be listed
```

---

## 2. Remove Docker apps (skip if Docker was never installed)

Review first:

```bash
sudo docker ps -a --filter name=^app_
sudo docker compose ls -a | grep '^app_'
sudo docker volume ls --filter name=^app_
```

Then remove them, **including their data volumes**:

```bash
# Compose apps (WordPress, Joomla, Ghost, EspoCRM, Supabase, …)
for p in $(sudo docker compose ls -a --format json | grep -o '"Name":"app_[^"]*"' | cut -d'"' -f4); do
  sudo docker compose -p "$p" down -v --remove-orphans
done

# Single-container apps
sudo docker ps -aq --filter name=^app_ | xargs -r sudo docker rm -f

# Leftover volumes
sudo docker volume ls -q --filter name=^app_ | xargs -r sudo docker volume rm
```

Check `sudo docker ps -a` once more. Anything still listed that you created
through the panel (for example a Shopify app or a custom proxy app) can be removed
with `sudo docker rm -f <name>`.

---

## 3. Remove nginx sites and SSL certificates

```bash
# Panel-generated sites (symlinks into /srv/nginx-configs) — listed, then removed
sudo find /etc/nginx/sites-enabled -lname '/srv/nginx-configs/*' -print -delete

# The panel's own site
sudo rm -f /etc/nginx/sites-enabled/serverhub /etc/nginx/sites-available/serverhub
```

The installer removed nginx's stock default site. If you keep nginx (step 9),
put it back so nginx still has a default server:

```bash
[ -f /etc/nginx/sites-available/default ] && \
  sudo ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

SSL certificates issued for the panel and its sites:

```bash
sudo certbot certificates                        # list them
sudo certbot delete --cert-name panel.yourdomain.com
# repeat for each domain the panel managed
```

---

## 4. Remove the sudo rules

```bash
sudo rm -f /etc/sudoers.d/serverhub
sudo visudo -c                                   # must say "parsed OK"
```

---

## 5. Remove MySQL databases created in the panel (optional)

The panel created normal MySQL databases and users. List them and drop only the
ones you made through ServerHub:

```bash
sudo mysql -e "SHOW DATABASES; SELECT user, host FROM mysql.user;"

sudo mysql -e "DROP DATABASE mydb; DROP USER 'myuser'@'localhost';"
```

Skip this if you remove MySQL completely in step 9.

---

## 6. Delete the files

```bash
sudo rm -rf /srv/serverhub /srv/projects /srv/websites /srv/nginx-configs /srv/onedrive
sudo rm -rf /opt/serverhub-src
sudo rm -f /var/log/supervisor/serverhub*.log \
           /var/log/supervisor/*_dashboard*.log \
           /var/log/supervisor/app_*.log
```

If you installed it from a different folder (e.g. a clone in your home
directory), delete that folder too.

---

## 7. Remove the system users

```bash
sudo pkill -u serverhub 2>/dev/null; sudo userdel -r serverhub
# Only if the "Linux Desktop (XFCE)" app was installed:
id xfcedesk >/dev/null 2>&1 && { sudo pkill -u xfcedesk; sudo userdel -r xfcedesk; }
```

`/var/log/supervisor` was handed to `serverhub` during install. Give it back to root:

```bash
sudo chown root:root /var/log/supervisor
```

---

## 8. Close the firewall ports (optional)

Only if nothing else on the server serves web traffic:

```bash
sudo ufw delete allow 'Nginx Full'
sudo ufw status
```

If your network firewall (for example Sophos) forwards ports 80/443 to this
server, ask your IT team to remove that rule too.

---

## 9. Remove the system packages (optional)

Only do this if **nothing else** on the server uses them. Pick what applies.

```bash
# Web stack
sudo apt purge -y nginx nginx-common supervisor certbot python3-certbot-nginx

# PHP (all installed versions)
sudo apt purge -y 'php*'

# MySQL — ⚠️ deletes ALL databases on the server
sudo apt purge -y mysql-server mysql-client mysql-common
sudo rm -rf /var/lib/mysql /etc/mysql

# Node.js (NodeSource repo)
sudo apt purge -y nodejs
sudo rm -f /etc/apt/sources.list.d/nodesource.list /etc/apt/sources.list.d/nodesource.sources \
           /usr/share/keyrings/nodesource.gpg /etc/apt/keyrings/nodesource.gpg

# Google Chrome
sudo apt purge -y google-chrome-stable
sudo rm -f /etc/apt/sources.list.d/google-chrome.list

# Docker (installed by the Apps section) — ⚠️ deletes ALL containers/images/volumes
sudo apt purge -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo rm -rf /var/lib/docker /var/lib/containerd

# Extras the Apps section may have added
sudo apt purge -y onedrive syncthing gh xvfb x11vnc novnc websockify fluxbox
sudo rm -f /etc/apt/sources.list.d/onedrive.list /etc/apt/sources.list.d/github-cli.list
sudo rm -rf /opt/flutter /usr/local/bin/flutter /usr/local/bin/dart

# Clean up
sudo apt autoremove --purge -y
sudo apt update
```

`apt purge` prints "Unable to locate package" or "not installed" for anything
that isn't there. That's fine.

---

## 10. Verify

```bash
sudo supervisorctl status 2>/dev/null | grep -Ei 'serverhub|_dashboard|^app_'   # no output
id serverhub                                   # "no such user"
ls /srv                                        # no serverhub/projects/websites/nginx-configs
ls /etc/sudoers.d/ /etc/nginx/sites-enabled/ 2>/dev/null
sudo docker ps -a 2>/dev/null | grep app_           # no output
curl -sI http://127.0.0.1:8765 || echo "panel is gone"
```

---

## Reinstalling later

A fresh install is the same one-liner as before (see `README.md`). To bring your
data back, restore the step-0 backup: `tar xzf serverhub-files.tgz -C /` for
files and `sudo mysql < mysql-all.sql` for databases, then run
`sudo bash /opt/serverhub-src/deploy/update.sh` to fix ownership.
