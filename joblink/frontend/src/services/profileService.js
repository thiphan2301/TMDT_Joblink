// Lỗi kèm mã HTTP để trang biết khi nào cần yêu cầu đăng nhập (401).
function createError(data, status, fallback) {
  const error = new Error(data.message || `${fallback} Mã lỗi: ${status}`);
  error.status = status;
  return error;
}

// Lấy thông tin cá nhân của ứng viên đang đăng nhập.
export async function getMyProfile(signal) {
  const response = await fetch("/api/profile", {
    signal,
    headers: {
      Accept: "application/json",
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw createError(data, response.status, "Không tải được hồ sơ.");
  }

  return data;
}

// Cập nhật thông tin cá nhân; trả về hồ sơ sau khi lưu.
export async function updateMyProfile(profile) {
  const response = await fetch("/api/profile", {
    method: "PUT",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(profile),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw createError(data, response.status, "Không lưu được hồ sơ.");
  }

  return data;
}
