// One consistent set of simple outline icons (24×24, 1.8px stroke).

const PATHS = {
  scale: (<><line x1="12" y1="4" x2="12" y2="20" /><line x1="8" y1="20" x2="16" y2="20" /><line x1="5" y1="7" x2="19" y2="7" /><path d="M5 7l-3 6a3 3 0 0 0 6 0z" /><path d="M19 7l-3 6a3 3 0 0 0 6 0z" /></>),
  home: (<><path d="M4 11l8-7 8 7" /><path d="M6 10v10h12V10" /></>),
  overview: (<><rect x="3.5" y="3.5" width="7" height="7" rx="2" /><rect x="13.5" y="3.5" width="7" height="7" rx="2" /><rect x="3.5" y="13.5" width="7" height="7" rx="2" /><rect x="13.5" y="13.5" width="7" height="7" rx="2" /></>),
  file: (<><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><polyline points="14 3 14 8 19 8" /></>),
  compare: (<><circle cx="6" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" /><path d="M6 8.5V14a4 4 0 0 0 4 4h5.5" /><path d="M18 15.5V10a4 4 0 0 0-4-4H8.5" /></>),
  userCheck: (<><circle cx="9" cy="8" r="3.5" /><path d="M3 20a6 6 0 0 1 12 0" /><polyline points="16 11 18 13 22 9" /></>),
  sparkle: (<><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" /><path d="M19 15.5l.8 1.7 1.7.8-1.7.8-.8 1.7-.8-1.7-1.7-.8 1.7-.8z" /></>),
  shield: (<><path d="M12 3l7 3v6c0 4.4-2.9 7.6-7 9-4.1-1.4-7-4.6-7-9V6z" /><polyline points="9 12 11 14 15 10" /></>),
  alert: (<><circle cx="12" cy="12" r="9" /><line x1="12" y1="7.5" x2="12" y2="13" /><line x1="12" y1="16.5" x2="12" y2="16.6" /></>),
  close: (<><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></>),
  upload: (<><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" /><polyline points="7.5 8.5 12 4 16.5 8.5" /><line x1="12" y1="4" x2="12" y2="15" /></>),
  list: (<><line x1="9" y1="6" x2="20" y2="6" /><line x1="9" y1="12" x2="20" y2="12" /><line x1="9" y1="18" x2="20" y2="18" /><polyline points="3.5 6 4.5 7 6.5 5" /><polyline points="3.5 12 4.5 13 6.5 11" /><polyline points="3.5 18 4.5 19 6.5 17" /></>),
  wallet: (<><path d="M4 7a2 2 0 0 1 2-2h12v4" /><rect x="4" y="7" width="16" height="12" rx="2.5" /><circle cx="16" cy="13" r="1.2" /></>),
  calendar: (<><rect x="4" y="5" width="16" height="15" rx="2.5" /><line x1="4" y1="10" x2="20" y2="10" /><line x1="9" y1="3" x2="9" y2="7" /><line x1="15" y1="3" x2="15" y2="7" /></>),
  check: <polyline points="5 12.5 10 17 19 7.5" />,
  cross: (<><line x1="7" y1="7" x2="17" y2="17" /><line x1="17" y1="7" x2="7" y2="17" /></>),
  help: (<><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6" /><line x1="12" y1="17" x2="12" y2="17.1" /></>),
  mic: (<><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0" /><line x1="12" y1="17.5" x2="12" y2="21" /></>),
  stop: <rect x="7" y="7" width="10" height="10" rx="2" />,
  volume: (<><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" /><path d="M15.5 9a4 4 0 0 1 0 6" /><path d="M18 6.5a7.5 7.5 0 0 1 0 11" /></>),
  external: (<><path d="M14 4h6v6" /><line x1="20" y1="4" x2="11" y2="13" /><path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" /></>),
  globe: (<><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18z" /></>),
  trash: (<><polyline points="4 7 20 7" /><path d="M9.5 7V4.5h5V7" /><path d="M6 7l1 13h10l1-13" /></>),
  sun: (<><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4" /></>),
  moon: <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />,
  arrowRight: (<><line x1="5" y1="12" x2="19" y2="12" /><polyline points="13 6 19 12 13 18" /></>),
  arrowLeft: (<><line x1="19" y1="12" x2="5" y2="12" /><polyline points="11 6 5 12 11 18" /></>),
  send: (<><path d="M4 12l16-8-6 16-2.5-6.5z" /><line x1="11.5" y1="13.5" x2="20" y2="4" /></>),
  chat: (<><path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8l-5 4v-4H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" /><line x1="8" y1="10" x2="16" y2="10" /><line x1="8" y1="13" x2="13" y2="13" /></>),
  text: (<><line x1="5" y1="6" x2="19" y2="6" /><line x1="5" y1="10" x2="19" y2="10" /><line x1="5" y1="14" x2="15" y2="14" /><line x1="5" y1="18" x2="12" y2="18" /></>),
  edit: (<><path d="M4 20h4L19 9l-4-4L4 16z" /><line x1="13.5" y1="6.5" x2="17.5" y2="10.5" /></>),
  refresh: (<><path d="M20 12a8 8 0 1 1-2.34-5.66" /><polyline points="20 4 20 9 15 9" /></>),
  lock: (<><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>),
  book: (<><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" /><path d="M4 19V5" /><line x1="9" y1="8" x2="15" y2="8" /></>),
};

export default function Icon({ name, size = 18, className = '', strokeWidth = 1.8, title }) {
  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title ? <title>{title}</title> : null}
      {PATHS[name] ?? null}
    </svg>
  );
}
