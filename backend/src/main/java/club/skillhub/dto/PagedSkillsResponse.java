package club.skillhub.dto;

import java.util.List;

public record PagedSkillsResponse(
    List<SkillSummaryDto> skills,
    long total,
    int page,
    int pageSize
) {}
