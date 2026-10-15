package group7.joblink.dto.request;

import java.math.BigDecimal;
import java.time.LocalDate;

// Dữ liệu admin gửi lên khi thêm / sửa tin tuyển dụng.
// industry thuộc về công ty sở hữu tin (bảng companies) — service cập nhật luôn ở đó.
// companyId chỉ bắt buộc khi tạo tin mới (POST). displayDays / tokenCost để
// trống khi tạo thì database tự dùng mặc định của cột (V7: 7 ngày / 20 Token).
// status: open | closed | pending_review | draft | expired | rejected
public record AdminJobRequest(
    Integer companyId,
    Integer displayDays,
    Integer tokenCost,
    String title,
    String description,
    BigDecimal salaryMin,
    BigDecimal salaryMax,
    String salaryUnit,
    String location,
    String industry,
    String level,
    String workingSchedule,
    String jobType,
    LocalDate deadline,
    String status
) {
}
