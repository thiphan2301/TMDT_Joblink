// Icon SVG vẽ tay cho khu vực nhà tuyển dụng (cùng phong cách với
// AdminIcons): nhận size qua props, nét vẽ kế thừa màu chữ hiện tại.
const base = (p) => ({
  width: p.size || 20,
  height: p.size || 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
});

export const IconDashboard = (p) => (
    <svg {...base(p)}><rect x="3" y="3" width="7.5" height="9" rx="1.5" /><rect x="13.5" y="3" width="7.5" height="5.5" rx="1.5" /><rect x="13.5" y="12" width="7.5" height="9" rx="1.5" /><rect x="3" y="15.5" width="7.5" height="5.5" rx="1.5" /></svg>
);
export const IconBriefcase = (p) => (
    <svg {...base(p)}><rect x="3" y="7.5" width="18" height="12" rx="2" /><path d="M9 7.5V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5" /><path d="M3 12.5h18" /></svg>
);
export const IconInbox = (p) => (
    <svg {...base(p)}><path d="M3 13.5 5.5 5h13L21 13.5V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4.5Z" /><path d="M3 13.5h5l1.2 2.5h5.6L16 13.5h5" /></svg>
);
export const IconUsers = (p) => (
    <svg {...base(p)}><circle cx="9" cy="8.5" r="3.5" /><path d="M3.5 19.5c.6-3 2.8-4.5 5.5-4.5s4.9 1.5 5.5 4.5" /><circle cx="17" cy="9.5" r="2.6" /><path d="M15.8 15.2c2.3.2 4 1.6 4.6 4" /></svg>
);
export const IconSearch = (p) => (
    <svg {...base(p)}><circle cx="11" cy="11" r="7" /><path d="m20.5 20.5-4.6-4.6" /></svg>
);
export const IconChat = (p) => (
    <svg {...base(p)}><path d="M21 12a8 8 0 0 1-8 8H4l2-3a8 8 0 1 1 15-5Z" /><path d="M8.5 11h.01M12 11h.01M15.5 11h.01" /></svg>
);
export const IconCrown = (p) => (
    <svg {...base(p)}><path d="m3 8.5 4.2 3.7L12 5l4.8 7.2L21 8.5l-1.7 9.5H4.7L3 8.5Z" /><path d="M5.5 21h13" /></svg>
);
export const IconPlus = (p) => (
    <svg {...base(p)}><path d="M12 5v14M5 12h14" /></svg>
);
export const IconEdit = (p) => (
    <svg {...base(p)}><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4.2 1.2L5 15 16.5 3.5Z" /></svg>
);
export const IconTrash = (p) => (
    <svg {...base(p)}><path d="M4 6.5h16M9 6V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V6" /><path d="M6.5 6.5 7.4 19a1.8 1.8 0 0 0 1.8 1.7h5.6a1.8 1.8 0 0 0 1.8-1.7L17.5 6.5" /><path d="M10 10.5v6M14 10.5v6" /></svg>
);
export const IconSend = (p) => (
    <svg {...base(p)}><path d="M21 3 10.5 13.5M21 3l-6.8 18-3.7-7.5L3 9.8 21 3Z" /></svg>
);
export const IconCheck = (p) => (
    <svg {...base(p)}><path d="m4.5 12.5 5 5 10-11" /></svg>
);
export const IconX = (p) => (
    <svg {...base(p)}><path d="M5 5l14 14M19 5 5 19" /></svg>
);
export const IconLogout = (p) => (
    <svg {...base(p)}><path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></svg>
);
export const IconBuilding = (p) => (
    <svg {...base(p)}><rect x="5" y="3" width="14" height="18" rx="1" /><path d="M9 7.5h2M13 7.5h2M9 11.5h2M13 11.5h2M9 15.5h2M13 15.5h2" /><path d="M3 21h18" /></svg>
);
export const IconWallet = (p) => (
    <svg {...base(p)}><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M16.5 12.5h.01" /><path d="M3 9.5h18" /></svg>
);
export const IconEye = (p) => (
    <svg {...base(p)}><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="3" /></svg>
);
export const IconStar = (p) => (
    <svg {...base(p)} fill={p.filled ? "currentColor" : "none"}><path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9L12 3.5Z" /></svg>
);
export const IconDots = (p) => (
    <svg {...base(p)}><path d="M12 5.5h.01M12 12h.01M12 18.5h.01" strokeWidth="2.6" /></svg>
);
export const IconPin = (p) => (
    <svg {...base(p)}><path d="M12 21.5s-7-5.6-7-11a7 7 0 0 1 14 0c0 5.4-7 11-7 11Z" /><circle cx="12" cy="10.3" r="2.6" /></svg>
);
export const IconCalendar = (p) => (
    <svg {...base(p)}><rect x="3.5" y="5" width="17" height="16" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" /></svg>
);
export const IconClock = (p) => (
    <svg {...base(p)}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>
);
export const IconArrowUp = (p) => (
    <svg {...base(p)}><path d="M12 19V5M6 11l6-6 6 6" /></svg>
);
export const IconFile = (p) => (
    <svg {...base(p)}><path d="M6 2.5h8L19 7.5V21a.5.5 0 0 1-.5.5h-12A.5.5 0 0 1 6 21V2.5Z" /><path d="M13.5 2.5v5.5H19" /><path d="M9 13h6M9 16.5h6" /></svg>
);
export const IconDownload = (p) => (
    <svg {...base(p)}><path d="M12 4v11m0 0 4.5-4.5M12 15 7.5 10.5" /><path d="M4 19.5h16" /></svg>
);
export const IconFilter = (p) => (
    <svg {...base(p)}><path d="M4 5h16l-6.2 7.2v5.3L10.2 19v-6.8L4 5Z" /></svg>
);
export const IconChart = (p) => (
    <svg {...base(p)}><path d="M4 20h16" /><path d="M7.5 20v-5.5M12 20V7.5M16.5 20v-8.5" /></svg>
);
export const IconInfo = (p) => (
    <svg {...base(p)}><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5" /><path d="M12 7.8h.01" /></svg>
);
export const IconCamera = (p) => (
    <svg {...base(p)}><path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h1.6l1.7-2.4a1 1 0 0 1 .8-.4h4.8a1 1 0 0 1 .8.4L17 7h1.5A1.5 1.5 0 0 1 20 8.5V18a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18V8.5Z" /><circle cx="12" cy="13" r="3.4" /></svg>
);
export const IconSmile = (p) => (
    <svg {...base(p)}><circle cx="12" cy="12" r="8.5" /><path d="M8.5 14.2c.9 1.1 2.1 1.7 3.5 1.7s2.6-.6 3.5-1.7" /><path d="M9 9.4h.01" /><path d="M15 9.4h.01" /></svg>
);
export const IconImage = (p) => (
    <svg {...base(p)}><rect x="3.5" y="5" width="17" height="14" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="M4.5 17.5 10 12l3.5 3.5L17 12l2.5 2.5" /></svg>
);
export const IconUser = (p) => (
    <svg {...base(p)}><circle cx="12" cy="8" r="3.6" /><path d="M5 19.5c1.2-3 3.9-4.5 7-4.5s5.8 1.5 7 4.5" /></svg>
);
export const IconBookmark = (p) => (
    <svg {...base(p)}><path d="M7 4.5h10V20l-5-3.4L7 20Z" /></svg>
);
export const IconBot = (p) => (
    <svg {...base(p)}><rect x="4.5" y="8" width="15" height="10.5" rx="2.5" /><path d="M12 8V4.8" /><circle cx="12" cy="3.8" r="1" /><path d="M9 13h.01" /><path d="M15 13h.01" /><path d="M9.5 16c.7.6 1.6.9 2.5.9s1.8-.3 2.5-.9" /></svg>
);
export const IconSettings = (p) => (
    <svg {...base(p)}><circle cx="12" cy="12" r="3" /><path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4 18 18M18 6l-1.6 1.6M7.6 16.4 6 18" /></svg>
);
export const IconGlobe = (p) => (
    <svg {...base(p)}><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.4 2.3 3.6 5.1 3.6 8.5s-1.2 6.2-3.6 8.5c-2.4-2.3-3.6-5.1-3.6-8.5S9.6 5.8 12 3.5Z" /></svg>
);
export const IconShare = (p) => (
    <svg {...base(p)}><circle cx="6" cy="12" r="2.5" /><circle cx="17.5" cy="5.5" r="2.5" /><circle cx="17.5" cy="18.5" r="2.5" /><path d="M8.2 10.8 15.3 6.7M8.2 13.2l7.1 4.1" /></svg>
);
export const IconFlag = (p) => (
    <svg {...base(p)}><path d="M5 21V4" /><path d="M5 4.8c4-2.2 7 2 13 .2v9c-6 1.8-9-2.4-13-.2" /></svg>
);
export const IconMail = (p) => (
    <svg {...base(p)}><rect x="3.5" y="5.5" width="17" height="13" rx="2" /><path d="m4.5 7 7.5 6 7.5-6" /></svg>
);
export const IconPhone = (p) => (
    <svg {...base(p)}><path d="M5.5 4h4l1.5 4.5L8.7 10a12 12 0 0 0 5.3 5.3l1.5-2.3L20 14.5v4a2 2 0 0 1-2.2 2A17.5 17.5 0 0 1 3.5 6.2 2 2 0 0 1 5.5 4Z" /></svg>
);
export const IconChevronRight = (p) => (
    <svg {...base(p)}><path d="m9.5 5 7 7-7 7" /></svg>
);
export const IconArrowRight = (p) => (
    <svg {...base(p)}><path d="M4 12h15M13.5 5.5 20 12l-6.5 6.5" /></svg>
);
export const IconShield = (p) => (
    <svg {...base(p)}><path d="M12 3.5 5 5.8v5.4c0 4.3 2.9 7.4 7 9.3 4.1-1.9 7-5 7-9.3V5.8Z" /><path d="m9.3 11.8 2 2 3.6-3.8" /></svg>
);
export const IconChevronDown = (p) => (
    <svg {...base(p)}><path d="m5.5 9.5 6.5 6.5 6.5-6.5" /></svg>
);
export const IconMonitor = (p) => (
    <svg {...base(p)}><rect x="2.5" y="4" width="19" height="13" rx="2" /><path d="M9 20.5h6M12 17v3.5" /></svg>
);
export const IconMegaphone = (p) => (
    <svg {...base(p)}><path d="m3 11 18-5v12L3 14v-3Z" /><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" /></svg>
);
export const IconCalculator = (p) => (
    <svg {...base(p)}><rect x="5" y="2.5" width="14" height="19" rx="2" /><path d="M8.5 6.5h7" /><path d="M8.5 11h.01M12 11h.01M15.5 11h.01M8.5 14.5h.01M12 14.5h.01M15.5 14.5h.01M8.5 18h.01M12 18h.01M15.5 18h.01" /></svg>
);
export const IconTruck = (p) => (
    <svg {...base(p)}><path d="M2.5 6h11.5v10H2.5z" /><path d="M14 9.5h3.8L21 13v3h-7" /><circle cx="6.8" cy="17.8" r="1.9" /><circle cx="17.2" cy="17.8" r="1.9" /><path d="M8.7 16H14M15.3 16h.01" /></svg>
);
export const IconPalette = (p) => (
    <svg {...base(p)}><circle cx="12" cy="12" r="9" /><circle cx="8.2" cy="9.8" r="1.05" fill="currentColor" stroke="none" /><circle cx="12" cy="7.6" r="1.05" fill="currentColor" stroke="none" /><circle cx="15.8" cy="9.8" r="1.05" fill="currentColor" stroke="none" /><path d="M12 21a2.4 2.4 0 0 1 0-4.8h1.6a3.9 3.9 0 0 0 3.9-3.9c0-.5-.06-1-.17-1.45" /></svg>
);
export const IconGradCap = (p) => (
    <svg {...base(p)}><path d="M2 9.5 12 4l10 5.5L12 15 2 9.5Z" /><path d="M6 11.6v4.2c0 1.6 2.7 3.2 6 3.2s6-1.6 6-3.2v-4.2" /><path d="M22 9.5V15" /></svg>
);
export const IconFacebook = (p) => (
    <svg {...base(p)}><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3Z" /></svg>
);
export const IconInstagram = (p) => (
    <svg {...base(p)}><rect x="2.5" y="2.5" width="19" height="19" rx="5" /><circle cx="12" cy="12" r="4" /><path d="M17.3 6.7h.01" /></svg>
);
export const IconLinkedin = (p) => (
    <svg {...base(p)}><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4V8" /><rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" /></svg>
);
export const IconTwitter = (p) => (
    <svg {...base(p)}><path d="M22 4.5c-.8.9-1.7 1.6-2.7 2a4.1 4.1 0 0 0-7 3.7v1A11.6 11.6 0 0 1 3.4 4.9a4.1 4.1 0 0 0 1.3 5.5c-.7 0-1.4-.2-2-.5v.1c0 2 1.4 3.7 3.3 4a4.2 4.2 0 0 1-1.8.1 4.1 4.1 0 0 0 3.8 2.8A8.3 8.3 0 0 1 2 18.6a11.7 11.7 0 0 0 6.3 1.8c7.5 0 11.7-6.3 11.7-11.7v-.5c.8-.6 1.5-1.3 2-2.2" /></svg>
);