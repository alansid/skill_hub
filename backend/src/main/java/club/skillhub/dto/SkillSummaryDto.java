package club.skillhub.dto;

import java.util.List;

public record SkillSummaryDto(
    String id,
    String slug,
    String name,
    String description,
    CategoryDto category,
    List<TagDto> tags,
    String author,
    String version,
    int installCount,
    List<String> compatibleTools,
    String createdAt,
    String status,
    double avgRating,
    int ratingCount
) {}
