function createError(data, status, fallback) {
    const error = new Error(
        data.message || `${fallback} Mã lỗi: ${status}`
    );

    error.status = status;
    return error;
}

async function readResponse(response, fallback) {
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw createError(data, response.status, fallback);
    }

    return data;
}

// Lấy danh sách CV của người đang đăng nhập.
export async function getMyCvs(signal) {
    const response = await fetch("/api/cvs", {
        signal,
        credentials: "same-origin",
        headers: { Accept: "application/json" },
    });

    return readResponse(response, "Không tải được danh sách CV.");
}

// Upload: tên trường "file" phải khớp @RequestParam("file") ở backend.
export async function uploadCv(file) {
    const body = new FormData();
    body.append("file", file);

    const response = await fetch("/api/cvs", {
        method: "POST",
        credentials: "same-origin",
        headers: { Accept: "application/json" },
        body,
    });

    // Không tự đặt Content-Type: trình duyệt tự tạo multipart boundary.
    return readResponse(response, "Không tải CV lên được.");
}

export async function setDefaultCv(id) {
    const response = await fetch(
        `/api/cvs/${encodeURIComponent(id)}/default`,
        {
            method: "PUT",
            credentials: "same-origin",
            headers: { Accept: "application/json" },
        }
    );

    return readResponse(response, "Không chọn được CV mặc định.");
}

export async function downloadCv(id, fileName) {
    const response = await fetch(
        `/api/cvs/${encodeURIComponent(id)}/file`,
        {
            credentials: "same-origin",
        }
    );

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));

        throw createError(
            data,
            response.status,
            "Không tải được file CV."
        );
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = fileName || "CV.pdf";

    document.body.appendChild(link);
    link.click();
    link.remove();

    // Giải phóng bộ nhớ sau khi trình duyệt bắt đầu tải.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}