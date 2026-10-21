package group7.joblink.dto.request;

import java.math.BigDecimal;
import java.time.LocalDate;

// Dữ liệu gửi lên cho khu vực nhà tuyển dụng.
public final class EmployerRequests {

    private EmployerRequests() {
    }

    // Tạo / sửa tin tuyển dụng của chính nhà tuyển dụng.
    // status chỉ nhận: draft (lưu nháp) | open (đăng luôn) | closed (đóng tin).
    public record EmployerJobRequest(
            String title,
            Integer companyId,
            String description,
            String requirements,
            BigDecimal salaryMin,
            BigDecimal salaryMax,
            String salaryUnit,
            String location,
            String jobType,
            String level,
            Integer vacancies,
            String workingSchedule,
            LocalDate deadline,
            String status,
            Integer displayDays,
            Integer tokenCost
    ) {
    }

    // Đổi trạng thái (dùng cho cả tin tuyển dụng và đơn ứng tuyển).
    public record StatusRequest(
            String status
    ) {
    }

    // Cập nhật hồ sơ công ty của chính nhà tuyển dụng.
    public record CompanyUpdateRequest(
            String name,
            String legalName,
            String taxCode,
            String website,
            String industry,
            String size,
            String address,
            String description,
            String logo,
            String cover
    ) {
    }

    // Phản hồi một đánh giá của ứng viên về công ty.
    public record ReplyRequest(
            String content
    ) {
    }
}