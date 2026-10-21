package group7.joblink.controller;

import group7.joblink.dto.request.EmployerRequests.CompanyUpdateRequest;
import group7.joblink.dto.request.EmployerRequests.EmployerJobRequest;
import group7.joblink.dto.request.EmployerRequests.ReplyRequest;
import group7.joblink.dto.request.EmployerRequests.StatusRequest;
import group7.joblink.dto.response.EmployerResponses.*;
import group7.joblink.service.EmployerImageStorageService;
import group7.joblink.service.EmployerService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.io.Resource;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;
import java.util.concurrent.TimeUnit;

// API khu vực nhà tuyển dụng (/api/employer/**) — yêu cầu 13:
// quản lý cơ bản của nhà tuyển dụng (tin đăng ~ "sản phẩm", đơn ứng
// tuyển ~ "đơn hàng", tổng quan số liệu ~ "doanh thu" phía người bán),
// cộng thêm tìm kiếm ứng viên theo gói, hồ sơ công ty, đánh giá và ví.
// Mọi endpoint đều qua EmployerAccess: phải đăng nhập bằng tài khoản
// nhà tuyển dụng, và service chỉ cho thao tác trên dữ liệu của chính họ.
@RestController
@RequestMapping("/api/employer")
public class EmployerController {

    private final EmployerService employerService;
    private final EmployerAccess employerAccess;
    private final EmployerImageStorageService imageStorage;

    public EmployerController(EmployerService employerService,
                              EmployerAccess employerAccess,
                              EmployerImageStorageService imageStorage) {
        this.employerService = employerService;
        this.employerAccess = employerAccess;
        this.imageStorage = imageStorage;
    }

    // from/to (yyyy-MM-dd) chọn khoảng ngày cho biểu đồ phân tích;
    // bỏ trống = 30 ngày gần nhất.
    @GetMapping("/dashboard")
    public Dashboard dashboard(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            HttpServletRequest request) {
        int employerId = employerAccess.requireEmployerId(request);
        return employerService.getDashboard(employerId, from, to);
    }

    @GetMapping("/companies")
    public List<CompanyOption> companies(HttpServletRequest request) {
        int employerId = employerAccess.requireEmployerId(request);
        return employerService.getCompanies(employerId);
    }

    /* ---------------- Tin tuyển dụng ---------------- */

    @GetMapping("/jobs")
    public List<EmployerJobRow> jobs(HttpServletRequest request) {
        int employerId = employerAccess.requireEmployerId(request);
        return employerService.getJobs(employerId);
    }

    @PostMapping("/jobs")
    public ResponseEntity<EmployerJobRow> createJob(
            @RequestBody EmployerJobRequest body, HttpServletRequest request) {
        int employerId = employerAccess.requireEmployerId(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(employerService.createJob(employerId, body));
    }

    @GetMapping("/jobs/{id}")
    public EmployerJobRow getJob(@PathVariable int id, HttpServletRequest request) {
        int employerId = employerAccess.requireEmployerId(request);
        return employerService.getJob(employerId, id);
    }

    @PutMapping("/jobs/{id}")
    public EmployerJobRow updateJob(@PathVariable int id,
                                    @RequestBody EmployerJobRequest body,
                                    HttpServletRequest request) {
        int employerId = employerAccess.requireEmployerId(request);
        return employerService.updateJob(employerId, id, body);
    }

    @PatchMapping("/jobs/{id}/status")
    public ResponseEntity<Void> setJobStatus(@PathVariable int id,
                                             @RequestBody StatusRequest body,
                                             HttpServletRequest request) {
        int employerId = employerAccess.requireEmployerId(request);
        employerService.setJobStatus(employerId, id, body == null ? null : body.status());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/jobs/{id}")
    public ResponseEntity<Void> deleteJob(@PathVariable int id,
                                          HttpServletRequest request) {
        int employerId = employerAccess.requireEmployerId(request);
        employerService.deleteJob(employerId, id);
        return ResponseEntity.noContent().build();
    }

    /* ---------------- Đơn ứng tuyển ---------------- */

    @GetMapping("/jobs/{jobId}/applications")
    public List<EmployerApplicationRow> applications(
            @PathVariable int jobId, HttpServletRequest request) {
        int employerId = employerAccess.requireEmployerId(request);
        return employerService.getApplications(employerId, jobId);
    }

    // Toàn bộ đơn trên mọi tin — trang Quản lý ứng viên.
    @GetMapping("/applications")
    public List<GlobalApplicationRow> applicationsGlobal(
            @RequestParam(required = false) Integer jobId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String q,
            HttpServletRequest request) {
        int employerId = employerAccess.requireEmployerId(request);
        return employerService.getApplicationsGlobal(employerId, jobId, status, q);
    }

    @GetMapping("/applications/summary")
    public ApplicationSummary applicationsSummary(HttpServletRequest request) {
        int employerId = employerAccess.requireEmployerId(request);
        return employerService.getApplicationSummary(employerId);
    }

    @GetMapping("/applications/{id}")
    public ApplicationDetail applicationDetail(
            @PathVariable int id, HttpServletRequest request) {
        int employerId = employerAccess.requireEmployerId(request);
        return employerService.getApplicationDetail(employerId, id);
    }

    @PatchMapping("/applications/{id}/status")
    public EmployerApplicationRow setApplicationStatus(
            @PathVariable int id, @RequestBody StatusRequest body,
            HttpServletRequest request) {
        int employerId = employerAccess.requireEmployerId(request);
        return employerService.updateApplicationStatus(
                employerId, id, body == null ? null : body.status());
    }

    /* ---------------- Tìm kiếm ứng viên ---------------- */

    @GetMapping("/candidates")
    public CandidateSearchResponse candidates(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String skill,
            @RequestParam(required = false) String location,
            HttpServletRequest request) {
        int employerId = employerAccess.requireEmployerId(request);
        return employerService.searchCandidates(employerId, q, skill, location);
    }

    @GetMapping("/candidates/{id}")
    public CandidateDetail candidateDetail(
            @PathVariable int id, HttpServletRequest request) {
        int employerId = employerAccess.requireEmployerId(request);
        return employerService.getCandidateDetail(employerId, id);
    }

    /* ---------------- Hồ sơ công ty ---------------- */

    @GetMapping("/company")
    public CompanyProfile company(
            @RequestParam(required = false) Integer companyId,
            HttpServletRequest request) {
        int employerId = employerAccess.requireEmployerId(request);
        return employerService.getCompanyProfile(employerId, companyId);
    }

    @PutMapping("/company/{id}")
    public CompanyProfile updateCompany(
            @PathVariable int id, @RequestBody CompanyUpdateRequest body,
            HttpServletRequest request) {
        int employerId = employerAccess.requireEmployerId(request);
        return employerService.updateCompanyProfile(employerId, id, body);
    }

    // Tải logo công ty lên từ máy tính (form field tên "file").
    @PostMapping("/company/{id}/logo")
    public CompanyProfile uploadCompanyLogo(
            @PathVariable int id, @RequestParam("file") MultipartFile file,
            HttpServletRequest request) {
        int employerId = employerAccess.requireEmployerId(request);
        return employerService.uploadCompanyLogo(employerId, id, file);
    }

    // Tải ảnh bìa công ty lên từ máy tính (form field tên "file").
    @PostMapping("/company/{id}/cover")
    public CompanyProfile uploadCompanyCover(
            @PathVariable int id, @RequestParam("file") MultipartFile file,
            HttpServletRequest request) {
        int employerId = employerAccess.requireEmployerId(request);
        return employerService.uploadCompanyCover(employerId, id, file);
    }

    // Phục vụ ảnh đã tải lên (logo công ty) — đường dẫn này được lưu
    // trong companies.logo và hiển thị cả ở trang công khai nên không
    // yêu cầu đăng nhập; tên file là UUID do máy chủ tạo.
    @GetMapping("/company-images/{name}")
    public ResponseEntity<Resource> companyImage(@PathVariable String name) {
        Resource resource = imageStorage.load(name);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(imageStorage.contentTypeOf(name)))
                .cacheControl(CacheControl.maxAge(7, TimeUnit.DAYS))
                .body(resource);
    }

    /* ---------------- Đánh giá & phản hồi ---------------- */

    @GetMapping("/reviews")
    public ReviewsResponse reviews(HttpServletRequest request) {
        int employerId = employerAccess.requireEmployerId(request);
        return employerService.getReviews(employerId);
    }

    @PostMapping("/reviews/{id}/reply")
    public ReviewsResponse replyToReview(
            @PathVariable int id, @RequestBody ReplyRequest body,
            HttpServletRequest request) {
        int employerId = employerAccess.requireEmployerId(request);
        return employerService.replyToReview(
                employerId, id, body == null ? null : body.content());
    }

    /* ---------------- Gói dịch vụ + ví ---------------- */

    @GetMapping("/plan")
    public PlanInfo plan(HttpServletRequest request) {
        int employerId = employerAccess.requireEmployerId(request);
        return employerService.getPlan(employerId);
    }

    @GetMapping("/packages")
    public PackagesResponse packages(HttpServletRequest request) {
        int employerId = employerAccess.requireEmployerId(request);
        return employerService.getPackages(employerId);
    }

    @GetMapping("/subscriptions")
    public List<SubscriptionRow> subscriptions(HttpServletRequest request) {
        int employerId = employerAccess.requireEmployerId(request);
        return employerService.getSubscriptionHistory(employerId);
    }

    @GetMapping("/wallet")
    public WalletInfo wallet(HttpServletRequest request) {
        int employerId = employerAccess.requireEmployerId(request);
        return employerService.getWallet(employerId);
    }
}