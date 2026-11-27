// Gói của nhà tuyển dụng lúc đăng tin (job.displayTier: basic | pro | premium).

// Nhãn hiển thị trên thẻ tin; tin thường không có nhãn.
export const TIER_BADGES = {
  premium: "★ Tin Premium",
  pro: "Tin Pro",
};

// Thứ hạng hiển thị: premium > pro > basic.
export function tierRank(job) {
  return { premium: 2, pro: 1 }[job.displayTier] ?? 0;
}
