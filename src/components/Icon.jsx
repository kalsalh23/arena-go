// Inline SVG icon set (stroke style, like the reference UI) — replaces emoji icons.
const P = {
  home: (<><path d="M3 10.8 12 3.5l9 7.3" /><path d="M5.5 9.5V20a.7.7 0 0 0 .7.7h11.6a.7.7 0 0 0 .7-.7V9.5" /><path d="M9.8 20.6v-5.5h4.4v5.5" /></>),
  search: (<><circle cx="11" cy="11" r="7" /><path d="m20.5 20.5-4.2-4.2" /></>),
  filter: (<path d="M4 5h16l-6.2 7.4v5.1L10.2 20v-7.6L4 5z" />),
  ball: (<><circle cx="12" cy="12" r="8.6" /><path d="M12 8.2l3.6 2.6-1.4 4.2h-4.4L8.4 10.8 12 8.2z" /><path d="M12 3.4v4.8M20.3 9.4l-4.7 1.4M17.8 19.4l-3.6-4.4M6.2 19.4l3.6-4.4M3.7 9.4l4.7 1.4" /></>),
  trophy: (<><path d="M8 4h8v5a4 4 0 0 1-8 0V4z" /><path d="M8 5H4.8a3.2 3.2 0 0 0 3.3 3.6M16 5h3.2a3.2 3.2 0 0 1-3.3 3.6" /><path d="M12 13v3.4" /><path d="M8.5 20.5h7M10.2 20.3c0-2 .9-3.9 1.8-3.9s1.8 1.9 1.8 3.9" /></>),
  calendar: (<><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M3.5 9.5h17M8 3v4M16 3v4" /></>),
  user: (<><circle cx="12" cy="8" r="3.6" /><path d="M4.8 20c.8-3.6 3.8-5.6 7.2-5.6s6.4 2 7.2 5.6" /></>),
  users: (<><circle cx="9" cy="8.5" r="3.2" /><path d="M2.8 19.4c.7-3.2 3.2-5 6.2-5s5.5 1.8 6.2 5" /><path d="M15.4 5.6a3.2 3.2 0 0 1 0 5.9M17.6 14.8c2 .6 3.3 2.1 3.8 4.3" /></>),
  bell: (<><path d="M6 10a6 6 0 0 1 12 0c0 4 1.5 5.4 1.5 5.4h-15S6 14 6 10z" /><path d="M10.3 19a1.8 1.8 0 0 0 3.4 0" /></>),
  star: (<path d="m12 3.6 2.5 5.2 5.7.8-4.1 4 1 5.6-5.1-2.7-5.1 2.7 1-5.6-4.1-4 5.7-.8L12 3.6z" />),
  clock: (<><circle cx="12" cy="12" r="8.6" /><path d="M12 7v5.2l3.4 2" /></>),
  pin: (<><path d="M12 21s-6.8-5.4-6.8-10.2a6.8 6.8 0 0 1 13.6 0C18.8 15.6 12 21 12 21z" /><circle cx="12" cy="10.6" r="2.4" /></>),
  phone: (<path d="M5.5 4h3l1.7 4-2 1.5a12 12 0 0 0 5.8 5.8l1.5-2 4 1.7v3a1.8 1.8 0 0 1-2 1.8A16.5 16.5 0 0 1 3.7 6a1.8 1.8 0 0 1 1.8-2z" />),
  copy: (<><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5" /></>),
  chevL: (<path d="m14.5 5.5-6.5 6.5 6.5 6.5" />),
  chevD: (<path d="m6 9.5 6 6 6-6" />),
  plus: (<path d="M12 5v14M5 12h14" />),
  x: (<path d="m6 6 12 12M18 6 6 18" />),
  check: (<path d="m4.5 12.5 5 5L19.5 7" />),
  checkC: (<><circle cx="12" cy="12" r="8.6" /><path d="m8.3 12.3 2.6 2.6 4.8-5" /></>),
  card: (<><rect x="3" y="5.5" width="18" height="13.5" rx="2.5" /><path d="M3 10h18M7 15h4" /></>),
  camera: (<><path d="M4 8.5A1.8 1.8 0 0 1 5.8 6.7h1.9l1.4-2.2h5.8l1.4 2.2h1.9A1.8 1.8 0 0 1 20 8.5v9a1.8 1.8 0 0 1-1.8 1.8H5.8A1.8 1.8 0 0 1 4 17.5v-9z" /><circle cx="12" cy="12.6" r="3.4" /></>),
  qr: (<><rect x="4" y="4" width="6.5" height="6.5" rx="1" /><rect x="13.5" y="4" width="6.5" height="6.5" rx="1" /><rect x="4" y="13.5" width="6.5" height="6.5" rx="1" /><path d="M13.5 13.5h3v3h-3zM17.5 17.5H20V20h-2.5zM13.5 20v-1.5M20 13.5h-1.5" /></>),
  edit: (<><path d="M14.5 5.5 18.5 9.5 8 20H4v-4L14.5 5.5z" /><path d="m12.8 7.2 4 4" /></>),
  trash: (<><path d="M4.5 6.5h15M9.5 6.5V4.8A1.3 1.3 0 0 1 10.8 3.5h2.4a1.3 1.3 0 0 1 1.3 1.3v1.7" /><path d="M6.5 6.5 7.3 19a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4l.8-12.5" /></>),
  send: (<><path d="M20.5 3.5 3.5 10.7l6.4 2.6 2.6 6.4 8-16.2z" /><path d="M9.9 13.3 20.5 3.5" /></>),
  info: (<><circle cx="12" cy="12" r="8.6" /><path d="M12 11.2v4.8M12 8v.2" /></>),
  shield: (<path d="M12 3.5 19 6v5.5c0 4.6-3 7.8-7 9-4-1.2-7-4.4-7-9V6l7-2.5z" />),
  sliders: (<><path d="M5 6.5h14M5 12h14M5 17.5h14" /><circle cx="9" cy="6.5" r="1.8" fill="currentColor" stroke="none" /><circle cx="15" cy="12" r="1.8" fill="currentColor" stroke="none" /><circle cx="8" cy="17.5" r="1.8" fill="currentColor" stroke="none" /></>),
  logout: (<><path d="M14.5 8V5.8a1.8 1.8 0 0 0-1.8-1.8H6.3a1.8 1.8 0 0 0-1.8 1.8v12.4a1.8 1.8 0 0 0 1.8 1.8h6.4a1.8 1.8 0 0 0 1.8-1.8V16" /><path d="M9.5 12h11M17.5 8.8 20.7 12l-3.2 3.2" /></>),
  image: (<><rect x="3.5" y="4.5" width="17" height="15" rx="2.5" /><circle cx="9" cy="9.5" r="1.6" /><path d="m3.5 16.5 4.8-4.5 4 3.6 3.2-2.9 5 4.8" /></>),
  money: (<><rect x="3" y="6.5" width="18" height="11.5" rx="2" /><circle cx="12" cy="12.2" r="2.6" /><path d="M6.2 9.4v.2M17.8 15v.2" /></>),
  building: (<><path d="M4.5 20.5V6.3L12 3.5l7.5 2.8v14.2" /><path d="M9 20.5v-5h6v5" /><path d="M9 9.4h.2M12 9.4h.2M15 9.4h.2M9 12.4h.2M12 12.4h.2M15 12.4h.2" /></>),
  gift: (<><rect x="3.5" y="8" width="17" height="4" rx="1.2" /><path d="M5 12v7a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-7M12 8v12.5" /><path d="M12 8s-4.5.2-4.5-2.2C7.5 4.2 10.5 4 12 8zM12 8s4.5.2 4.5-2.2C16.5 4.2 13.5 4 12 8z" /></>),
  whatsapp: (<path fill="currentColor" stroke="none" d="M12 2a9.9 9.9 0 0 0-8.5 15L2 22l5.2-1.4A10 10 0 1 0 12 2zm5.4 14c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5s.8 1.9.8 2c.1.2.1.4 0 .6l-.4.6c-.2.2-.4.4-.2.8.2.3.9 1.5 2 2.4 1.4 1.2 2.5 1.6 2.9 1.8.3.2.5.1.7-.1l1-1.2c.2-.3.4-.2.7-.1l2 1c.3.1.5.2.6.4 0 .1 0 .7-.3 1.4z" />),
  telegram: (<path fill="currentColor" stroke="none" d="M21.7 4.4 18.9 19c-.2 1-.8 1.2-1.6.8l-4.5-3.3-2.2 2.1c-.2.2-.4.4-.9.4l.3-4.6L18.4 7c.4-.3-.1-.5-.6-.2L7.7 13.3l-4.4-1.4c-1-.3-1-1 .2-1.4L20.3 3c.8-.3 1.6.2 1.4 1.4z" />),
  instagram: (<><rect x="3.5" y="3.5" width="17" height="17" rx="4.5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" /></>),
  globe: (<><circle cx="12" cy="12" r="8.6" /><path d="M3.4 12h17.2M12 3.4c2.4 2.4 3.6 5.4 3.6 8.6s-1.2 6.2-3.6 8.6c-2.4-2.4-3.6-5.4-3.6-8.6s1.2-6.2 3.6-8.6z" /></>),
  flag: (<><path d="M5.5 21V4" /><path d="M5.5 4.8c4.5-2.4 8.5 2 13-.2v9.6c-4.5 2.2-8.5-2.2-13 .2" /></>),
  dice: (<><rect x="4" y="4" width="16" height="16" rx="3.5" /><circle cx="8.8" cy="8.8" r="1.2" fill="currentColor" stroke="none" /><circle cx="15.2" cy="15.2" r="1.2" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" /></>),
  shirt: (<path d="m8.5 3.5 3.5 2 3.5-2 4 2.5-1.8 3.6-1.7-.8v10.7h-8V8.8l-1.7.8L4.5 6l4-2.5z" />),
}

export default function Icon({ name, size = 20, className = '', style, strokeWidth = 1.8 }) {
  const glyph = P[name]
  if (!glyph) return null
  return (
    <svg
      className={`ic-svg ${className}`}
      style={style}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {glyph}
    </svg>
  )
}
