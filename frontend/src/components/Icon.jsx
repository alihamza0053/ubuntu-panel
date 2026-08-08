/**
 * One consistent 24px-grid stroke icon set for the whole panel.
 *
 * Every glyph is drawn on a 24×24 viewBox with 1.75 stroke, round caps and
 * joins, and inherits `currentColor` — so an icon takes the colour of whatever
 * text or button it sits in. Transport controls (play / stop / record) render
 * solid instead of stroked.
 *
 *   <Icon name="play" />            16px, inherits colour
 *   <Icon name="folder" size={20} className="text-mint-300" />
 *
 * No emoji anywhere in the UI chrome — add a glyph here instead.
 */

// Stroked glyphs: JSX children drawn with fill="none" stroke="currentColor".
const STROKE = {
  // ── Navigation ────────────────────────────────────────────────────────
  home: <><path d="M3 10.5 12 3l9 7.5" /><path d="M5.5 9.5V20a1 1 0 0 0 1 1H10v-6h4v6h3.5a1 1 0 0 0 1-1V9.5" /></>,
  code: <><path d="m9 17-5-5 5-5" /><path d="m15 7 5 5-5 5" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18" /></>,
  shuffle: <><path d="M3 7h4l3.5 5" /><path d="M3 17h4l3.5-5" /><path d="M15 7h6m0 0-2.5-2.5M21 7l-2.5 2.5" /><path d="M15 17h6m0 0-2.5-2.5M21 17l-2.5 2.5" /></>,
  grid: <><rect x="3.5" y="3.5" width="7" height="7" rx="1.75" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.75" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.75" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.75" /></>,
  container: <><path d="M12 3 3.5 7.5v9L12 21l8.5-4.5v-9L12 3Z" /><path d="M3.5 7.5 12 12l8.5-4.5" /><path d="M12 12v9" /></>,
  terminal: <><rect x="3" y="4" width="18" height="16" rx="2.5" /><path d="m7.5 10 2.5 2-2.5 2" /><path d="M13 14h3.5" /></>,
  scroll: <><path d="M6 4h11a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" /><path d="M8 9h7" /><path d="M8 13h7" /><path d="M8 17h4" /></>,
  folder: <><path d="M3.5 7a2 2 0 0 1 2-2h3.4a2 2 0 0 1 1.5.7l1.1 1.3h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V7Z" /></>,
  'folder-plus': <><path d="M3.5 7a2 2 0 0 1 2-2h3.4a2 2 0 0 1 1.5.7l1.1 1.3h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V7Z" /><path d="M12 11.5v5" /><path d="M9.5 14h5" /></>,
  trash: <><path d="M4 6.5h16" /><path d="M9.5 6.5V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v1.5" /><path d="M6.5 6.5 7.4 19a2 2 0 0 0 2 1.9h5.2a2 2 0 0 0 2-1.9l.9-12.5" /><path d="M10.5 10.5v6M13.5 10.5v6" /></>,
  database: <><ellipse cx="12" cy="6" rx="7.5" ry="3" /><path d="M4.5 6v12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V6" /><path d="M4.5 12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3" /></>,
  sliders: <><path d="M5 20V13M5 9V4" /><path d="M12 20v-9M12 7V4" /><path d="M19 20v-5M19 11V4" /><path d="M2.5 11h5M9.5 9h5M16.5 13h5" /></>,
  monitor: <><rect x="3" y="4" width="18" height="12.5" rx="2" /><path d="M9 20.5h6" /><path d="M12 16.5v4" /></>,
  wrench: <><path d="M15.4 3.6a5.5 5.5 0 0 0-6.6 7.2L3.8 15.8a2.1 2.1 0 0 0 3 3l5-5a5.5 5.5 0 0 0 7.2-6.6l-3 3-2.6-2.6 3-3Z" /></>,
  store: <><path d="M4 4h16l1.2 4.3A3 3 0 0 1 18.3 12a3 3 0 0 1-3-2.3A3 3 0 0 1 12 12a3 3 0 0 1-3.2-2.3A3 3 0 0 1 5.7 12a3 3 0 0 1-2.9-3.7L4 4Z" /><path d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7" /><path d="M10 20.5V15h4v5.5" /></>,

  // ── Actions ───────────────────────────────────────────────────────────
  plus: <><path d="M12 5v14M5 12h14" /></>,
  minus: <><path d="M5 12h14" /></>,
  x: <><path d="m6 6 12 12M18 6 6 18" /></>,
  check: <><path d="m5 12.5 4.5 4.5L19 7" /></>,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></>,
  filter: <><path d="M4 5.5h16l-6.2 7.2V19l-3.6 1.8v-8.1L4 5.5Z" /></>,
  refresh: <><path d="M20 12a8 8 0 1 1-2.6-5.9" /><path d="M20 4v4h-4" /></>,
  upload: <><path d="M12 16V4" /><path d="m7.5 8.5 4.5-4.5 4.5 4.5" /><path d="M4 15v3.5A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5V15" /></>,
  download: <><path d="M12 4v12" /><path d="m7.5 11.5 4.5 4.5 4.5-4.5" /><path d="M4 15v3.5A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5V15" /></>,
  save: <><path d="M5 4h11l3 3v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" /><path d="M8 4v5h7V4" /><path d="M8 13h8v8H8z" /></>,
  edit: <><path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3Z" /><path d="m14.5 7.5 2 2" /></>,
  copy: <><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M15 6.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h.5" /></>,
  'external-link': <><path d="M14 4h6v6" /><path d="M20 4 11 13" /><path d="M18 14v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h5" /></>,
  link: <><path d="M10.5 13.5a4 4 0 0 0 5.7 0l2.8-2.8a4 4 0 1 0-5.7-5.7L11.9 6.4" /><path d="M13.5 10.5a4 4 0 0 0-5.7 0L5 13.3a4 4 0 1 0 5.7 5.7l1.4-1.4" /></>,
  'log-out': <><path d="M14 4h3.5A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5H14" /><path d="M10 16.5 5.5 12 10 7.5" /><path d="M5.5 12H15" /></>,
  eye: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="3" /></>,
  'eye-off': <><path d="M4 4 20 20" /><path d="M9.9 5.9A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-3 3.9" /><path d="M6.4 8.1A17 17 0 0 0 2.5 12S6 18.5 12 18.5a9.6 9.6 0 0 0 3.5-.7" /><path d="M10 10a3 3 0 0 0 4 4" /></>,
  lock: <><rect x="4.5" y="10" width="15" height="10.5" rx="2" /><path d="M8 10V7.5a4 4 0 0 1 8 0V10" /></>,
  key: <><circle cx="8" cy="15" r="4" /><path d="m11 12 8-8" /><path d="m16 7 2.5 2.5" /><path d="m19 4 2 2" /></>,
  package: <><path d="M12 3 3.5 7.5v9L12 21l8.5-4.5v-9L12 3Z" /><path d="M3.5 7.5 12 12l8.5-4.5" /><path d="M12 12v9" /><path d="m7.75 5.25 8.5 4.5" /></>,
  layers: <><path d="M12 3 3 7.5 12 12l9-4.5L12 3Z" /><path d="m3 12.5 9 4.5 9-4.5" /><path d="m3 17 9 4.5L21 17" /></>,
  clean: <><path d="m14 4 6 6" /><path d="M17 7 8.5 15.5a3 3 0 0 0-.8 1.4L7 20l3.1-.7a3 3 0 0 0 1.4-.8L20 10" /><path d="M4 20h4" /></>,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 1.8" /></>,
  calendar: <><rect x="3.5" y="5" width="17" height="15.5" rx="2" /><path d="M3.5 10h17" /><path d="M8 3v4M16 3v4" /></>,
  bell: <><path d="M6 9a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 13 6 9Z" /><path d="M10 18a2 2 0 0 0 4 0" /></>,
  user: <><circle cx="12" cy="8.5" r="3.75" /><path d="M4.5 20a7.5 7.5 0 0 1 15 0" /></>,
  users: <><circle cx="9.5" cy="8.5" r="3.5" /><path d="M3 20a6.5 6.5 0 0 1 13 0" /><path d="M16 5.2a3.5 3.5 0 0 1 0 6.6" /><path d="M17.5 14.6A6.5 6.5 0 0 1 21 20" /></>,
  shield: <><path d="M12 3 5 6v6c0 4.4 3 7.6 7 9 4-1.4 7-4.6 7-9V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></>,
  cloud: <><path d="M7.5 19a4.5 4.5 0 0 1-.4-9A6 6 0 0 1 18.5 11a4 4 0 0 1-.5 8H7.5Z" /></>,
  activity: <><path d="M3 12h4l2.5-7 5 14 2.5-7h4" /></>,
  cpu: <><rect x="7" y="7" width="10" height="10" rx="2" /><rect x="3.5" y="3.5" width="17" height="17" rx="3" /><path d="M9.5 1.5v2M14.5 1.5v2M9.5 20.5v2M14.5 20.5v2M1.5 9.5h2M1.5 14.5h2M20.5 9.5h2M20.5 14.5h2" /></>,
  chip: <><rect x="4.5" y="4.5" width="15" height="15" rx="3" /><path d="M9.5 9.5h5v5h-5z" /><path d="M9.5 2.5v2M14.5 2.5v2M9.5 19.5v2M14.5 19.5v2M2.5 9.5h2M2.5 14.5h2M19.5 9.5h2M19.5 14.5h2" /></>,
  disk: <><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M3 12.5h18" /><circle cx="7.5" cy="16" r="1" /><path d="M8 5v5M16 5v5" /></>,
  file: <><path d="M13 3.5H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9.5L13 3.5Z" /><path d="M13 3.5V9h6" /></>,
  'file-text': <><path d="M13 3.5H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9.5L13 3.5Z" /><path d="M13 3.5V9h6" /><path d="M8.5 13.5h7M8.5 17h4.5" /></>,
  table: <><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><path d="M3.5 9.5h17M3.5 14.5h17M9.5 9.5v10" /></>,
  'arrow-left': <><path d="M19 12H5" /><path d="m11 6-6 6 6 6" /></>,
  'arrow-up': <><path d="M12 19V5" /><path d="m6 11 6-6 6 6" /></>,
  'chevron-right': <><path d="m9 5 7 7-7 7" /></>,
  'chevron-down': <><path d="m5 9 7 7 7-7" /></>,
  info: <><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5.5" /><path d="M12 7.75v.5" /></>,
  alert: <><path d="M12 4 2.8 20h18.4L12 4Z" /><path d="M12 10v4.5" /><path d="M12 17.25v.5" /></>,
  menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
  more: <><circle cx="5.5" cy="12" r="1.25" /><circle cx="12" cy="12" r="1.25" /><circle cx="18.5" cy="12" r="1.25" /></>,
  dice: <><rect x="4" y="4" width="16" height="16" rx="3.5" /><circle cx="9" cy="9" r="1.15" /><circle cx="15" cy="15" r="1.15" /><circle cx="12" cy="12" r="1.15" /></>,
  pause: <><path d="M9 5v14M15 5v14" /></>,
  plug: <><path d="M9 3v5M15 3v5" /><path d="M6.5 8h11v3.5a5.5 5.5 0 0 1-11 0V8Z" /><path d="M12 17v4" /></>,
}

// Solid glyphs (transport controls).
const SOLID = {
  play: <path d="M8 5.2v13.6a.8.8 0 0 0 1.22.68l11-6.8a.8.8 0 0 0 0-1.36l-11-6.8A.8.8 0 0 0 8 5.2Z" />,
  stop: <rect x="5.5" y="5.5" width="13" height="13" rx="2.2" />,
  record: <circle cx="12" cy="12" r="6" />,
}

export default function Icon({ name, size = 16, className = '', title, ...rest }) {
  const solid = SOLID[name]
  const stroke = STROKE[name]
  if (!solid && !stroke) return null

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      className={`shrink-0 ${className}`}
      {...(solid
        ? { fill: 'currentColor', stroke: 'none' }
        : {
            fill: 'none',
            stroke: 'currentColor',
            strokeWidth: 1.75,
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
          })}
      {...rest}
    >
      {title && <title>{title}</title>}
      {solid || stroke}
    </svg>
  )
}
