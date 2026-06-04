package club.skillhub.dto;

public record SkillPublishResponse(
    String slug,
    String name,
    String version,
    String author,
    String status,
    String warning
) {}
