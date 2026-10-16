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