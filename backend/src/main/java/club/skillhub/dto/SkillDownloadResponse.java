package club.skillhub.dto;

import java.util.List;

public record SkillDownloadResponse(
    String slug,
    String name,
    String version,
    String content,
    List<SkillFileDto> files
) {}
