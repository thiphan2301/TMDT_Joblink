package group7.joblink.controller;

import group7.joblink.dto.response.CvResponse;
import group7.joblink.service.CvService;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.core.io.Resource;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

// Các API đều lấy ID người dùng từ session và chỉ thao tác CV thuộc người đó.

@RestController
@RequestMapping("/api/cvs")
public class CvController {

    private final CvService cvService;

    public CvController(CvService cvService) {
        this.cvService = cvService;
    }

    @GetMapping
    public List<CvResponse> getMyCvs(HttpServletRequest request) {
        return cvService.getMyCvs(CurrentUser.requireId(request));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public CvResponse upload(
            @RequestParam("file") MultipartFile file,
            HttpServletRequest request) {

        return cvService.upload(
                CurrentUser.requireId(request),
                file
        );
    }

    @PutMapping("/{id}/default")
    public CvResponse setDefault(
            @PathVariable("id") Integer id,
            HttpServletRequest request) {

        return cvService.setDefault(
                CurrentUser.requireId(request),
                id
        );
    }

    @GetMapping("/{id}/file")
    public ResponseEntity<Resource> download(
            @PathVariable("id") Integer id,
            HttpServletRequest request) {

        CvService.Download download = cvService.download(
                CurrentUser.requireId(request),
                id
        );

        String disposition = ContentDisposition
                .attachment()
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

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> handleError(
            ResponseStatusException exception) {

        String message = exception.getReason() == null
                ? "Không thể xử lý CV."
                : exception.getReason();

        return ResponseEntity
                .status(exception.getStatusCode())
                .body(Map.of("message", message));
    }
}