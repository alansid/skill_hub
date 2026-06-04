package club.skillhub.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

import java.util.List;

public record SkillUpdateRequest(
    @NotBlank String name,
    String description,
    @NotBlank @Pattern(regexp = "^\\d+\\.\\d+\\.\\d+$") String version,
    String categorySlug,
    List<String> tagSlugs,
    List<String> compatibleTools,
    String content
) {}
