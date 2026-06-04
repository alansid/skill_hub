package club.skillhub.dto;

import java.util.List;

public record CollectionDto(
    String id,
    String name,
    String description,
    List<SkillSummaryDto> skills
) {}
