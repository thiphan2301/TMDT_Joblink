export async function applyToJob(jobId) {
  const response = await fetch(
    `/api/jobs/${encodeURIComponent(jobId)}/applications`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.message ||
      `Không thể ứng tuyển. Mã lỗi: ${response.status}`
    );
  }

  return data;
}