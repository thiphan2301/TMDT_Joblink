package group7.joblink.dto.response;

import java.time.LocalDateTime;

public record CvResponse(
        Integer id,
        String fileName,
        boolean defaultCv,
        LocalDateTime uploadedAt,
        String downloadUrl
) {
}