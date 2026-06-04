package club.skillhub.dto;

public record RatingDto(
    String id,
    String userId,
    String displayName,
    int rating,
    String comment,
    String createdAt,
    String updatedAt
) {}
