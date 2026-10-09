package group7.joblink.controller;

import group7.joblink.service.ApplicationService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestController
@RequestMapping("/api/jobs")
@Profile("local")
@ConditionalOnProperty(
    name = "app.demo-applications.enabled",
    havingValue = "true"
)
public class ApplicationController {

    private final ApplicationService service;
    private final int demoCandidateId;

    public ApplicationController(
            ApplicationService service,
            @Value("${app.demo-candidate-id}") int demoCandidateId) {
        this.service = service;
        this.demoCandidateId = demoCandidateId;
    }

    @PostMapping("/{jobId}/applications")
    public Map<String, Object> apply(
            @PathVariable("jobId") int jobId) {
        return service.apply(demoCandidateId, jobId);
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