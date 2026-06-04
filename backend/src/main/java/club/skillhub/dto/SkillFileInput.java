package club.skillhub.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record SkillFileInput(
    @NotBlank
    @Pattern(regexp = "^[a-zA-Z0-9_\\-/]+\\.md$", message = "Path must be a relative .md path without '../'")
    String path,

    @NotBlank
    String content
) {}
