package club.skillhub.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;

public record SkillPublishRequest(

    @NotBlank(message = "name is required")
    @Size(max = 100, message = "name must be at most 100 characters")
    String name,

    @NotBlank(message = "slug is required")
    @Pattern(regexp = "^[a-z0-9]+(-[a-z0-9]+)*$",
             message = "slug must be lowercase letters, numbers and hyphens only")
    String slug,

    @NotBlank(message = "description is required")
    @Size(max = 1000, message = "description must be at most 1000 characters")
    String description,

    @NotBlank(message = "version is required")
    @Pattern(regexp = "^\\d+\\.\\d+\\.\\d+$", message = "version must be semver (e.g. 1.0.0)")
    String version,

    @NotBlank(message = "categorySlug is required")
    String categorySlug,

    List<String> tagSlugs,

    @NotEmpty(message = "compatibleTools must have at least one entry")
    List<String> compatibleTools,

    @NotBlank(message = "content is required")
    String content,

    @Valid @Size(max = 20, message = "At most 20 additional files allowed")
    List<SkillFileInput> files
) {
    public SkillPublishRequest {
        tagSlugs = tagSlugs == null ? List.of() : tagSlugs;
        files = files == null ? List.of() : files;
    }
}
