// Icon SVG vẽ tay theo mẫu thiết kế (tránh phụ thuộc thêm thư viện icon).
// Mọi icon nhận size qua prop, stroke = currentColor để CSS đổi màu theo trạng thái.

function base(props) {
  return {
    width: props.size || 20,
    height: props.size || 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };
}

export const IconGrid = (p) => (
  <svg {...base(p)}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>
);
export const IconUsers = (p) => (
  <svg {...base(p)}><circle cx="9" cy="8" r="3.5" /><path d="M3.5 19c.6-3 2.8-4.5 5.5-4.5s4.9 1.5 5.5 4.5" /><circle cx="17" cy="9" r="2.6" /><path d="M16.5 14.6c2.2.2 3.6 1.6 4 4" /></svg>
);
export const IconBriefcase = (p) => (
  <svg {...base(p)}><rect x="3" y="7.5" width="18" height="12" rx="2.5" /><path d="M9 7.5V6a2.5 2.5 0 0 1 2.5-2.5h1A2.5 2.5 0 0 1 15 6v1.5M3 12.5h18" /></svg>
);
export const IconChart = (p) => (
  <svg {...base(p)}><path d="M4 19.5h16M7 16v-5M11.5 16V7.5M16 16v-8M20 16V5" /></svg>
);
export const IconPackage = (p) => (
  <svg {...base(p)}><path d="M13 2.5 4.5 6v12L13 21.5 21.5 18V6L13 2.5Z" /><path d="M4.5 6 13 9.5 21.5 6M13 9.5v12" /></svg>
);
export const IconWallet = (p) => (
  <svg {...base(p)}><rect x="3" y="6" width="18" height="13" rx="2.5" /><path d="M3 10h18M16.5 15h.01" /></svg>
);
export const IconShield = (p) => (
  <svg {...base(p)}><path d="M12 3 5 5.8v5.4c0 4.3 2.9 7.4 7 9.3 4.1-1.9 7-5 7-9.3V5.8L12 3Z" /><path d="m9.2 11.8 2 2 3.6-3.8" /></svg>
);
export const IconFile = (p) => (
  <svg {...base(p)}><path d="M6 3h8l4 4v14H6V3Z" /><path d="M14 3v4h4M9 12h6M9 16h6" /></svg>
);
export const IconEdit = (p) => (
  <svg {...base(p)}><path d="M4 20h4.5L20 8.5a2.1 2.1 0 0 0-3-3L5.5 17 4 20Z" /><path d="m14.5 7 3 3" /></svg>
);
export const IconLock = (p) => (
  <svg {...base(p)}><rect x="5" y="10.5" width="14" height="9.5" rx="2" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" /></svg>
);
export const IconUnlock = (p) => (
  <svg {...base(p)}><rect x="5" y="10.5" width="14" height="9.5" rx="2" /><path d="M8 10.5V7.5a4 4 0 0 1 7.8-1.3" /></svg>
);
export const IconTrash = (p) => (
  <svg {...base(p)}><path d="M4 6.5h16M9 6V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V6M6.5 6.5l1 13h9l1-13" /></svg>
);
export const IconPlus = (p) => (
  <svg {...base(p)}><path d="M12 5v14M5 12h14" /></svg>
);
export const IconDownload = (p) => (
  <svg {...base(p)}><path d="M12 4v11M7.5 11 12 15.5 16.5 11M4.5 19.5h15" /></svg>
);
export const IconCheck = (p) => (
  <svg {...base(p)}><path d="m4.5 12.5 5 5 10-11" /></svg>
);
export const IconCheckCircle = (p) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="8.5" /><path d="m8.5 12.2 2.4 2.4 4.6-5" /></svg>
);
export const IconClock = (p) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>
);
export const IconChat = (p) => (
  <svg {...base(p)}><path d="M20 12a8 8 0 1 1-3.5-6.6L20 5l-.6 3.4c.4 1.1.6 2.3.6 3.6Z" /></svg>
);
export const IconClose = (p) => (
  <svg {...base(p)}><path d="M6 6l12 12M18 6 6 18" /></svg>
);
export const IconSend = (p) => (
  <svg {...base(p)}><path d="M21 3 10.5 13.5M21 3l-6.8 18-3.7-7.5L3 9.8 21 3Z" /></svg>
);
