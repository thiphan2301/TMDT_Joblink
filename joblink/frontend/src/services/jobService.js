export async function getJobs(signal) {
    const response = await fetch("/api/jobs", {
        signal
    });

    if (!response.ok) {
        throw new Error(`Không tải được việc làm. Mã lỗi: ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
        throw new Error("Dữ liệu việc làm trả về không đúng định dạng.");
    }

    return data;
}

export async function getJobDetail(id, signal) {
    const response = await fetch(`/api/jobs/${encodeURIComponent(id)}`, {
        signal,
    });

    if (response.status === 404) {
        throw new Error("Việc làm không tồn tại hoặc chưa được công khai.");
    }

    if (!response.ok) {
        throw new Error("Không tải được chi tiết việc làm.");
    }

    return response.json();
}