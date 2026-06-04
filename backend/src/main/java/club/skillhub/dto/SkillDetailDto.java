package club.skillhub.dto;

import java.util.List;

public record SkillDetailDto(
    String id,
    String slug,
    String name,
    String description,
    CategoryDto category,
    List<TagDto> tags,
    String author,
    String authorId,
    String version,
    int installCount,
    int installs24h,
    List<String> compatibleTools,
    String content,
    String createdAt,
    String updatedAt,
    String status,
    double avgRating,
    int ratingCount
) {}
