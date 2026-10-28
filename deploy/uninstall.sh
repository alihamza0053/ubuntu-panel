#!/usr/bin/env bash
# ============================================================
# ServerHub — complete uninstaller (one command).
#
# Removes the panel and everything it deployed: the panel service, project
# dashboards, Docker apps (app_*), panel-generated nginx sites and their SSL
# certificates, sudo rules, the serverhub user, and all panel files.
#
#   sudo bash /opt/serverhub-src/deploy/uninstall.sh
#   curl -fsSL https://raw.githubusercontent.com/alihamza0053/ubuntu-panel/main/deploy/uninstall.sh | sudo bash
#
# Options:
#   --yes        don't ask for confirmation (still backs up)
#   --no-backup  skip the automatic backup to /root/serverhub-final-backup-*
#
# It does NOT remove shared system packages (nginx, PHP, MySQL, Node, Docker…),
# MySQL databases, other nginx sites, firewall rules or Cloudflare tunnels —
# other software on the server may use them. See UNINSTALLING.md § 9.
# ============================================================
set -uo pipefail

PANEL_USER="serverhub"
PANEL_ROOT="/srv/serverhub"
NGINX_CONFIGS_ROOT="/srv/nginx-configs"

ASSUME_YES=false
DO_BACKUP=true
for arg in "$@"; do
  case "$arg" in
    --yes)       ASSUME_YES=true ;;
    --no-backup) DO_BACKUP=false ;;
    *) echo "Unknown option: $arg"; exit 1 ;;
  esac
done

# Everything runs from main(), so bash has parsed the whole script before it
# deletes the source checkout this file may live in.
main() {
  if [ "$(id -u)" -ne 0 ]; then
    echo "Please run with sudo / as root." >&2
    exit 1
  fi

  # Source checkout(s): the default one, plus whatever "Update now" points at
  SRC_DIRS=()
  local update_src=""
  [ -f "$PANEL_ROOT/backend/.env" ] && update_src="$(sed -n 's/^UPDATE_SRC=//p' "$PANEL_ROOT/backend/.env" | tail -1)"
  for d in /opt/serverhub-src "$update_src"; do
    [ -n "$d" ] && [ -f "$d/deploy/install.sh" ] && [[ ! " ${SRC_DIRS[*]} " =~ " $d " ]] && SRC_DIRS+=("$d")
  done

  DATA_DIRS=("$PANEL_ROOT" /srv/projects /srv/websites "$NGINX_CONFIGS_ROOT" /srv/onedrive)

  echo "============================================================"
  echo " ServerHub uninstall — this PERMANENTLY deletes:"
  echo "============================================================"
  for d in "${DATA_DIRS[@]}" "${SRC_DIRS[@]}"; do
    [ -e "$d" ] && printf "   %-34s %s\n" "$d" "$(du -sh "$d" 2>/dev/null | cut -f1)"
  done
  echo "   nginx: panel site + panel-generated sites:"
  panel_nginx_links | sed 's|^|      |'
  echo "   SSL certificates for those domains:"
  panel_cert_names | sed 's|^|      |'
  if command -v docker >/dev/null 2>&1; then
    echo "   Docker apps (containers + DATA volumes):"
    docker ps -a --filter name=^app_ --format '      {{.Names}}' 2>/dev/null
    docker volume ls -q --filter name=^app_ 2>/dev/null | sed 's|^|      volume |'
  fi
  echo "   supervisor program 'serverhub' + all panel dashboards/apps"
  echo "   /etc/sudoers.d/serverhub, users: $PANEL_USER$(id xfcedesk >/dev/null 2>&1 && echo ', xfcedesk')"
  echo
  echo " Kept: system packages, MySQL databases, other nginx sites, ufw rules,"
  echo "       Cloudflare tunnels."
  if [ "$DO_BACKUP" = true ]; then
    echo " A backup (panel db/.env/backups, projects, websites, MySQL dump) is"
    echo " written to /root/serverhub-final-backup-* first. Docker volume data is"
    echo " NOT in it — export those first if you need them (UNINSTALLING.md § 0)."
  else
    echo " --no-backup: NOTHING will be backed up."
  fi
  echo "============================================================"

  if [ "$ASSUME_YES" != true ]; then
    local answer=""
    printf 'Type DELETE to continue: '
    read -r answer </dev/tty || true
    [ "$answer" = "DELETE" ] || { echo "Aborted — nothing was changed."; exit 1; }
  fi

  [ "$DO_BACKUP" = true ] && backup

  echo "==> Stopping the panel, dashboards and service apps (supervisor)"
  rm -f /etc/supervisor/conf.d/serverhub.conf
  [ -f /etc/supervisor/supervisord.conf ] && \
    sed -i "s| $PANEL_ROOT/supervisor.d/\*.conf||" /etc/supervisor/supervisord.conf
  if command -v supervisorctl >/dev/null 2>&1; then
    supervisorctl reread >/dev/null 2>&1 || true
    supervisorctl update || true
  fi

  if command -v docker >/dev/null 2>&1; then
    echo "==> Removing Docker apps"
    local p
    for p in $(docker compose ls -a --format json 2>/dev/null | grep -o '"Name":"app_[^"]*"' | cut -d'"' -f4); do
      docker compose -p "$p" down -v --remove-orphans || true
    done
    docker ps -aq --filter name=^app_ | xargs -r docker rm -f || true
    docker volume ls -q --filter name=^app_ | xargs -r docker volume rm || true
  fi

  echo "==> Removing nginx sites"
  local certs
  certs="$(panel_cert_names)"          # read before the configs are gone
  panel_nginx_links | xargs -r rm -f
  rm -f /etc/nginx/sites-available/serverhub /etc/nginx/snippets/serverhub-panel.conf
  # install.sh removed nginx's stock default site — put it back
  [ -f /etc/nginx/sites-available/default ] && [ ! -e /etc/nginx/sites-enabled/default ] && \
    ln -s /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default
  if command -v nginx >/dev/null 2>&1; then
    if nginx -t 2>/dev/null; then systemctl reload nginx || true
    else echo "!! nginx -t failed — check: sudo nginx -t" >&2; fi
  fi

  if [ -n "$certs" ] && command -v certbot >/dev/null 2>&1; then
    echo "==> Deleting SSL certificates"
    local c
    for c in $certs; do certbot delete --non-interactive --cert-name "$c" || true; done
  fi

  echo "==> Removing sudo rules"
  rm -f /etc/sudoers.d/serverhub
  visudo -c >/dev/null || echo "!! visudo -c reports a problem — check /etc/sudoers.d/" >&2

  echo "==> Removing users"
  local u
  for u in "$PANEL_USER" xfcedesk; do
    if id "$u" >/dev/null 2>&1; then
      pkill -u "$u" 2>/dev/null || true
      sleep 1
      userdel -r "$u" 2>/dev/null || userdel "$u" || true
    fi
  done

  echo "==> Deleting files"
  rm -rf "${DATA_DIRS[@]}" "${SRC_DIRS[@]}"
  rm -f /var/log/supervisor/serverhub*.log /var/log/supervisor/*_dashboard*.log \
        /var/log/supervisor/app_*.log
  [ -d /var/log/supervisor ] && chown root:root /var/log/supervisor

  echo
  echo "============================================================"
  echo " ServerHub removed."
  [ "$DO_BACKUP" = true ] && echo " Backup: $BACKUP_DIR (copy it off the server)"
  echo
  echo " Still on the server, on purpose (remove by hand if unused —"
  echo " UNINSTALLING.md § 5, 8, 9):"
  echo "   - MySQL databases/users created in the panel"
  echo "   - packages: nginx, supervisor, PHP, MySQL, Node.js, Chrome, Docker"
  echo "   - ufw rules, port forwards on your network firewall"
  echo "   - a Cloudflare tunnel, if you set one up (cloudflared service)"
  echo "============================================================"
}

# Enabled nginx sites that belong to the panel
panel_nginx_links() {
  [ -d /etc/nginx/sites-enabled ] || return 0
  find /etc/nginx/sites-enabled -lname "$NGINX_CONFIGS_ROOT/*" 2>/dev/null
  [ -e /etc/nginx/sites-enabled/serverhub ] && echo /etc/nginx/sites-enabled/serverhub
  return 0
}

# Let's Encrypt certificates named after a domain the panel served
panel_cert_names() {
  local f n
  for f in "$NGINX_CONFIGS_ROOT"/* /etc/nginx/sites-available/serverhub; do
    [ -f "$f" ] || continue
    for n in $(sed -n 's/^\s*server_name\s\+\([^;]*\);.*/\1/p' "$f"); do
      [ "$n" != "_" ] && [ -d "/etc/letsencrypt/live/$n" ] && echo "$n"
    done
  done | sort -u
}

backup() {
  BACKUP_DIR="/root/serverhub-final-backup-$(date +%Y%m%d-%H%M%S)"
  echo "==> Backing up to $BACKUP_DIR"
  mkdir -p "$BACKUP_DIR"
  local keep=()
  local p
  for p in "$PANEL_ROOT/db" "$PANEL_ROOT/backend/.env" "$PANEL_ROOT/backups" \
           /srv/projects /srv/websites "$NGINX_CONFIGS_ROOT"; do
    [ -e "$p" ] && keep+=("$p")
  done
  if [ ${#keep[@]} -gt 0 ]; then
    tar czf "$BACKUP_DIR/serverhub-files.tgz" "${keep[@]}" 2>/dev/null \
      || echo "!! file backup had errors — check $BACKUP_DIR" >&2
  fi
  if command -v mysqldump >/dev/null 2>&1; then
    mysqldump --all-databases --single-transaction > "$BACKUP_DIR/mysql-all.sql" 2>/dev/null \
      || { rm -f "$BACKUP_DIR/mysql-all.sql"; echo "   (MySQL not running — no database dump)"; }
  fi
  ls -lh "$BACKUP_DIR"
}

main "$@"
exit
