package group7.joblink.controller;

import group7.joblink.service.CvService;
import group7.joblink.service.EmployerCvService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;

// Nhà tuyển dụng mở file CV (PDF) của ứng viên ngay trên trình duyệt.
@RestController
@RequestMapping("/api/employer")
public class EmployerCvController {

    private final EmployerCvService employerCvService;
    private final EmployerAccess employerAccess;

    public EmployerCvController(EmployerCvService employerCvService,
                                EmployerAccess employerAccess) {
        this.employerCvService = employerCvService;
        this.employerAccess = employerAccess;
    }

    // CV đính kèm một đơn ứng tuyển.
    @GetMapping("/applications/{id}/cv")
    public ResponseEntity<Resource> applicationCv(@PathVariable int id,
                                                  HttpServletRequest request) {
        int employerId = employerAccess.requireEmployerId(request);
        return pdf(employerCvService.applicationCv(employerId, id));
    }

    // Một CV trong hồ sơ ứng viên.
    @GetMapping("/candidates/{candidateId}/cvs/{cvId}/file")
    public ResponseEntity<Resource> candidateCv(@PathVariable int candidateId,
                                                @PathVariable int cvId,
                                                HttpServletRequest request) {
        int employerId = employerAccess.requireEmployerId(request);
        return pdf(employerCvService.candidateCv(employerId, candidateId, cvId));
    }

    // inline: mở xem trong tab mới thay vì tải về.
    private ResponseEntity<Resource> pdf(CvService.Download download) {
        String disposition = ContentDisposition.inline()
                .filename(download.fileName(), StandardCharsets.UTF_8)
                .build()
                .toString();

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition)
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .header("X-Content-Type-Options", "nosniff")
                .body(download.resource());
    }
}
