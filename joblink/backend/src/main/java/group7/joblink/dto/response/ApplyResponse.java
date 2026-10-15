package group7.joblink.dto.response;

public record ApplyResponse(
        boolean alreadyApplied,
        Integer applicationId,
        int balance,
        int cost,
        String message
) {
}