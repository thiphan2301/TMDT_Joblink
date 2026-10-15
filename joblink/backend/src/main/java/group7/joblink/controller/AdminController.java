package group7.joblink.controller;

import group7.joblink.dto.request.*;
import group7.joblink.dto.response.AdminResponses.*;
import group7.joblink.service.AdminService;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

// API cho khu vực quản trị — mọi endpoint đều qua AdminAccess.requireAdminId.
// Frontend gọi qua src/services/adminService.js.
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService adminService;
    private final AdminAccess adminAccess;

    public AdminController(AdminService adminService, AdminAccess adminAccess) {
        this.adminService = adminService;
        this.adminAccess = adminAccess;
    }

    /* ---------- Tổng quan & báo cáo ---------- */

    @GetMapping("/overview")
    public Overview overview(HttpServletRequest request) {
        adminAccess.requireAdminId(request);
        return adminService.getOverview();
    }

    @GetMapping("/reports")
    public Report reports(
            @RequestParam(name = "period", defaultValue = "6months") String period,
            HttpServletRequest request) {
        adminAccess.requireAdminId(request);
        return adminService.getReport(period);
    }

    /* ---------- Người dùng ---------- */

    @GetMapping("/users")
    public List<UserRow> users(HttpServletRequest request) {
        adminAccess.requireAdminId(request);
        return adminService.getUsers();
    }

    @PostMapping("/users")
    public ResponseEntity<UserRow> createUser(
            @RequestBody AdminUserRequest body, HttpServletRequest request) {
        adminAccess.requireAdminId(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(adminService.createUser(body));
    }

    @PutMapping("/users/{id}")
    public UserRow updateUser(
            @PathVariable("id") int id,
            @RequestBody AdminUserRequest body, HttpServletRequest request) {
        adminAccess.requireAdminId(request);
        return adminService.updateUser(id, body);
    }

    @PatchMapping("/users/{id}/status")
    public ResponseEntity<Void> setUserStatus(
            @PathVariable("id") int id,
            @RequestBody AdminStatusRequest body, HttpServletRequest request) {
        adminAccess.requireAdminId(request);
        adminService.setUserStatus(id, body.status());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<Void> deleteUser(
            @PathVariable("id") int id, HttpServletRequest request) {
        adminAccess.requireAdminId(request);
        adminService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }

    /* ---------- Tin tuyển dụng ---------- */

    @GetMapping("/jobs")
    public List<JobRow> jobs(HttpServletRequest request) {
        adminAccess.requireAdminId(request);
        return adminService.getJobs();
    }

    @PostMapping("/jobs")
    public ResponseEntity<Void> createJob(
            @RequestBody AdminJobRequest body, HttpServletRequest request) {
        Integer adminId = adminAccess.requireAdminId(request);
        adminService.createJob(body, adminId);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @GetMapping("/companies")
    public List<CompanyRow> companies(HttpServletRequest request) {
        adminAccess.requireAdminId(request);
        return adminService.getCompanies();
    }

    @PutMapping("/jobs/{id}")
    public JobRow updateJob(
            @PathVariable("id") int id,
            @RequestBody AdminJobRequest body, HttpServletRequest request) {
        Integer adminId = adminAccess.requireAdminId(request);
        return adminService.updateJob(id, body, adminId);
    }

    @PatchMapping("/jobs/{id}/status")
    public ResponseEntity<Void> setJobStatus(
            @PathVariable("id") int id,
            @RequestBody AdminStatusRequest body, HttpServletRequest request) {
        Integer adminId = adminAccess.requireAdminId(request);
        adminService.setJobStatus(id, body.status(), adminId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/jobs/{id}")
    public ResponseEntity<Void> deleteJob(
            @PathVariable("id") int id, HttpServletRequest request) {
        adminAccess.requireAdminId(request);
        adminService.deleteJob(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/jobs/{id}/applications")
    public List<ApplicationRow> jobApplications(
            @PathVariable("id") int id, HttpServletRequest request) {
        adminAccess.requireAdminId(request);
        return adminService.getJobApplications(id);
    }

    /* ---------- Gói dịch vụ ---------- */

    @GetMapping("/packages")
    public Packages packages(HttpServletRequest request) {
        adminAccess.requireAdminId(request);
        return adminService.getPackages();
    }

    @PostMapping("/packages")
    public ResponseEntity<Void> createPackage(
            @RequestBody AdminPackageRequest body, HttpServletRequest request) {
        adminAccess.requireAdminId(request);
        adminService.createPackage(body);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @PutMapping("/packages/{id}")
    public ResponseEntity<Void> updatePackage(
            @PathVariable("id") int id,
            @RequestBody AdminPackageRequest body, HttpServletRequest request) {
        adminAccess.requireAdminId(request);
        adminService.updatePackage(id, body);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/packages/{id}")
    public ResponseEntity<Void> deletePackage(
            @PathVariable("id") int id, HttpServletRequest request) {
        adminAccess.requireAdminId(request);
        adminService.deletePackage(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/packages/token-packages")
    public ResponseEntity<Void> createTokenPackage(
            @RequestBody AdminTokenPackageRequest body, HttpServletRequest request) {
        adminAccess.requireAdminId(request);
        adminService.createTokenPackage(body);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @PutMapping("/packages/token-packages/{id}")
    public ResponseEntity<Void> updateTokenPackage(
            @PathVariable("id") int id,
            @RequestBody AdminTokenPackageRequest body, HttpServletRequest request) {
        adminAccess.requireAdminId(request);
        adminService.updateTokenPackage(id, body);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/packages/token-packages/{id}")
    public ResponseEntity<Void> deleteTokenPackage(
            @PathVariable("id") int id, HttpServletRequest request) {
        adminAccess.requireAdminId(request);
        adminService.deleteTokenPackage(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/packages/promotions")
    public ResponseEntity<Void> createPromotion(
            @RequestBody AdminPromotionRequest body, HttpServletRequest request) {
        adminAccess.requireAdminId(request);
        adminService.createPromotion(body);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @PutMapping("/packages/promotions/{id}")
    public ResponseEntity<Void> updatePromotion(
            @PathVariable("id") int id,
            @RequestBody AdminPromotionRequest body, HttpServletRequest request) {
        adminAccess.requireAdminId(request);
        adminService.updatePromotion(id, body);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/packages/promotions/{id}")
    public ResponseEntity<Void> deletePromotion(
            @PathVariable("id") int id, HttpServletRequest request) {
        adminAccess.requireAdminId(request);
        adminService.deletePromotion(id);
        return ResponseEntity.noContent().build();
    }

    /* ---------- Lỗi ---------- */

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> handleAdminError(
            ResponseStatusException exception) {
        String message = exception.getReason() == null
                ? "Thao tác thất bại."
                : exception.getReason();
        return ResponseEntity
                .status(exception.getStatusCode())
                .body(Map.of("message", message));
    }
}
