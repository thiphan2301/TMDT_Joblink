// Biểu đồ vẽ bằng SVG thuần (không thêm thư viện) theo đúng bản thiết kế:
// - GrowthChart: 2 đường (người dùng mới = xanh dương, tin mới = xanh lá) + vùng mờ
// - DonutChart: vòng tròn phân bổ người dùng 72% / 25% / 3%
// - RevenueBars: cột doanh thu theo tháng

const DONUT_COLORS = ["#0071e3", "#6cb2f5", "#d7e7fb"];

function smoothPath(points) {
  if (points.length < 2) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export function GrowthChart({ data }) {
  const W = 640;
  const H = 260;
  const PAD = { l: 36, r: 8, t: 10, b: 26 };
  // Thang đo bám theo dữ liệu thật (sàn 10) — trước đây sàn 200 khiến
  // dữ liệu nhỏ (vài người dùng) bị ép sát đáy, nhìn như không có đường.
  const max = Math.max(10, ...data.map((d) => Math.max(d.newUsers, d.newJobs))) * 1.15;
  const x = (i) => PAD.l + (i * (W - PAD.l - PAD.r)) / Math.max(1, data.length - 1);
  const y = (v) => PAD.t + (1 - v / max) * (H - PAD.t - PAD.b);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(max * f));

  const userPts = data.map((d, i) => ({ x: x(i), y: y(d.newUsers) }));
  const jobPts = data.map((d, i) => ({ x: x(i), y: y(d.newJobs) }));
  const area = `${smoothPath(userPts)} L ${x(data.length - 1)} ${H - PAD.b} L ${x(0)} ${H - PAD.b} Z`;

  return (
    <svg className="admin-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Biểu đồ tăng trưởng nền tảng">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="#edf1f6" />
          <text x={PAD.l - 8} y={y(t) + 4} textAnchor="end" className="admin-chart__tick">{t}</text>
        </g>
      ))}
      {data.length > 1 && <path d={area} fill="#0071e3" opacity="0.07" />}
      <path d={smoothPath(jobPts)} fill="none" stroke="#3aa78c" strokeWidth="2.5" />
      <path d={smoothPath(userPts)} fill="none" stroke="#0071e3" strokeWidth="2.5" />
      {data.length === 1 && (
        <>
          <circle cx={jobPts[0].x} cy={jobPts[0].y} r="4" fill="#3aa78c" />
          <circle cx={userPts[0].x} cy={userPts[0].y} r="4" fill="#0071e3" />
        </>
      )}
      {data.map((d, i) => (
        <text key={d.month} x={x(i)} y={H - 6} textAnchor="middle" className="admin-chart__tick">{d.month}</text>
      ))}
    </svg>
  );
}

export function DonutChart({ data }) {
  const total = data.reduce((s, d) => s + (d.count || 0), 0) || 1;
  const R = 74;
  const C = 2 * Math.PI * R;
  let offset = 0;
  const segments = data.map((d, i) => {
    const frac = (d.count || 0) / total;
    const seg = { color: DONUT_COLORS[i % DONUT_COLORS.length], dash: frac * C, offset };
    offset += frac * C;
    return seg;
  });

  return (
    <div className="admin-donut-wrap">
      <svg className="admin-donut" viewBox="0 0 200 200" role="img" aria-label="Biểu đồ phân bổ người dùng">
        {segments.map((s, i) => (
          <circle
            key={i}
            cx="100" cy="100" r={R}
            fill="none" stroke={s.color} strokeWidth="30"
            strokeDasharray={`${Math.max(0, s.dash - 3)} ${C - Math.max(0, s.dash - 3)}`}
            strokeDashoffset={-s.offset}
            transform="rotate(-90 100 100)"
          />
        ))}
      </svg>
      <ul className="admin-donut__legend">
        {data.map((d, i) => (
          <li key={d.role}>
            <span className="admin-dot" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
            <span className="admin-donut__label">{d.label}</span>
            <strong>{d.percent}%</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RevenueBars({ data }) {
  const max = Math.max(1, ...data.map((d) => d.revenue));
  return (
    <div className="admin-bars" role="img" aria-label="Biểu đồ doanh thu theo tháng">
      {data.map((d) => (
        <div key={d.label} className="admin-bars__col">
          <div
            className="admin-bars__bar"
            style={{ height: `${Math.max(3, (d.revenue / max) * 100)}%` }}
            title={`${d.label}: ${d.revenue.toLocaleString("vi-VN")} đ`}
          />
          <span>{d.month}</span>
        </div>
      ))}
    </div>
  );
}
