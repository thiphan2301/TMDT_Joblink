package group7.joblink.dto.request;

// Đổi trạng thái nhanh từ danh sách: { "status": "locked" } hoặc { "status": "open" }...
public record AdminStatusRequest(
    String status
) {
}
