package group7.joblink.dto.request;

// Admin đổi gói dịch vụ cho nhà tuyển dụng.
// plan: "basic" (miễn phí, mặc định) | "pro" | "premium" (cấp cao nhất).
public record AdminPlanRequest(
    String plan
) {
}
