// Gửi ID token Google lên backend để đăng nhập (hoặc tạo tài khoản lần đầu).
// role: "candidate" | "employer" — chỉ dùng khi tài khoản chưa tồn tại.
export async function loginWithGoogle(credential, role) {
  const response = await fetch("/api/auth/google", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ credential, role }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.message ||
      `Đăng nhập Google thất bại. Mã lỗi: ${response.status}`
    );
  }

  return data;
}

// Gửi access token Facebook lên backend để đăng nhập (hoặc tạo tài khoản lần đầu).
// role: "candidate" | "employer" — chỉ dùng khi tài khoản chưa tồn tại.
export async function loginWithFacebook(accessToken, role) {
  const response = await fetch("/api/auth/facebook", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ accessToken, role }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.message ||
      `Đăng nhập Facebook thất bại. Mã lỗi: ${response.status}`
    );
  }

  return data;
}

// Lấy người dùng đang đăng nhập; trả về null nếu chưa đăng nhập.
export async function getCurrentUser() {
  const response = await fetch("/api/auth/me", {
    headers: {
      Accept: "application/json",
    },
  });

  if (response.status === 401 || response.status === 403) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Không lấy được thông tin đăng nhập. Mã lỗi: ${response.status}`);
  }

  return response.json();
}

export async function logout() {
  await fetch("/api/auth/logout", { method: "POST" });

  // Tắt tự động chọn lại tài khoản Google ở lần đăng nhập sau.
  window.google?.accounts?.id?.disableAutoSelect();
}
