package group7.joblink.controller;

import group7.joblink.dto.response.ApplyResponse;
import group7.joblink.service.ApplicationService;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestController
@RequestMapping("/api/jobs")
public class ApplicationController {

    private final ApplicationService applicationService;

    public ApplicationController(ApplicationService applicationService) {
        this.applicationService = applicationService;
    }

    @PostMapping("/{jobId}/applications")
    public ApplyResponse apply(
            @PathVariable("jobId") Integer jobId,
            HttpServletRequest request) {

        Integer candidateId = CurrentUser.requireId(request);

        return applicationService.apply(candidateId, jobId);
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> handleApplicationError(
            ResponseStatusException exception) {

        String message = exception.getReason() == null
                ? "Không thể ứng tuyển."
                : exception.getReason();

        return ResponseEntity
                .status(exception.getStatusCode())
                .body(Map.of("message", message));
    }
}