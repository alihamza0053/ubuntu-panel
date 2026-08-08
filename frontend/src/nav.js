// Sidebar/nav definition shared by the Layout (rendering) and App (route
// guards). `perm` is the permission key a non-admin user needs to see it.
// `icon` is a key into the shared Icon set (components/Icon.jsx) — no emoji.
export const NAV = [
  { to: '/shopify-apps', label: 'Shopify Apps', icon: 'store', perm: 'shopify' },
  { to: '/dashboard', label: 'Dashboard', icon: 'home', perm: 'dashboard' },
  { to: '/projects', label: 'Projects', icon: 'code', perm: 'projects' },
  { to: '/websites', label: 'Websites', icon: 'globe', perm: 'websites' },
  { to: '/proxies', label: 'Proxies', icon: 'shuffle', perm: 'proxies' },
  { to: '/apps', label: 'Apps', icon: 'grid', perm: 'apps' },
  { to: '/docker', label: 'Docker', icon: 'container', perm: 'docker' },
  { to: '/terminal', label: 'Terminal', icon: 'terminal', perm: 'terminal' },
  { to: '/logs', label: 'Logs', icon: 'scroll', perm: 'logs' },
  { to: '/files', label: 'Files', icon: 'folder', perm: 'files' },
  { to: '/recycle-bin', label: 'Recycle Bin', icon: 'trash', perm: 'files' },
  { to: '/databases', label: 'Databases', icon: 'database', perm: 'databases' },
  { to: '/nginx', label: 'Nginx', icon: 'sliders', perm: 'nginx' },
  { to: '/server', label: 'Server', icon: 'monitor', perm: 'server' },
  { to: '/settings', label: 'Settings', icon: 'wrench', perm: 'settings' },
]

// Paths promoted to the centred text links in the top bar (in this order).
export const TOPBAR = ['/dashboard', '/projects', '/websites', '/apps', '/server']

// First nav path a user is allowed to see (for redirects).
export function firstAllowed(can) {
  return (NAV.find((n) => can(n.perm)) || { to: '/dashboard' }).to
}
