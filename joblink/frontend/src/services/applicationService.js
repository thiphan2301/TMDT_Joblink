export async function applyToJob(jobId) {
    const response = await fetch(
        `/api/jobs/${encodeURIComponent(jobId)}/applications`,
        {
            method: "POST",
            credentials: "same-origin",
            headers: {
                Accept: "application/json",
            },
        }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        const error = new Error(
            data.message || `Không thể ứng tuyển. Mã lỗi: ${response.status}`
        );

        // Cho giao diện phân biệt lỗi 401 với lỗi thiếu token, thiếu CV...
        error.status = response.status;
        throw error;
    }

    return data;
}

// Danh sách việc đã ứng tuyển của ứng viên đang đăng nhập,
// kèm lịch sử trạng thái và lời mời phỏng vấn (nếu có).
export async function getMyApplications(signal) {
    const response = await fetch("/api/applications/me", {
        signal,
        credentials: "same-origin",
        headers: {
            Accept: "application/json",
        },
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
        const error = new Error(
            data?.message ||
            `Không tải được việc đã ứng tuyển. Mã lỗi: ${response.status}`
        );

        error.status = response.status;
        throw error;
    }

    return Array.isArray(data) ? data : [];
}