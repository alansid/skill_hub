package club.skillhub.controller;

import club.skillhub.dto.*;
import club.skillhub.service.SkillService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class SkillController {

    private final SkillService skillService;

    @GetMapping("/skills")
    public ResponseEntity<PagedSkillsResponse> getSkills(
        @RequestParam(defaultValue = "trending") String sort,
        @RequestParam(required = false) String category,
        @RequestParam(required = false) String tag,
        @RequestParam(required = false) String q,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "24") int pageSize
    ) {
        return ResponseEntity.ok(skillService.getSkills(sort, category, tag, q, page, pageSize));
    }

    @GetMapping("/skills/categories")
    public ResponseEntity<Map<String, List<CategoryDto>>> getCategories() {
        return ResponseEntity.ok(Map.of("categories", skillService.getCategories()));
    }

    @GetMapping("/skills/tags")
    public ResponseEntity<Map<String, List<TagDto>>> getTags() {
        return ResponseEntity.ok(Map.of("tags", skillService.getTags()));
    }

    @GetMapping("/skills/{slug}")
    public ResponseEntity<SkillDetailDto> getSkillDetail(@PathVariable String slug) {
        return ResponseEntity.ok(skillService.getSkillBySlug(slug));
    }

    @GetMapping("/skills/{slug}/download")
    public ResponseEntity<SkillDownloadResponse> downloadSkill(@PathVariable String slug) {
        return ResponseEntity.ok(skillService.getSkillDownload(slug));
    }

    @GetMapping("/skills/{slug}/related")
    public ResponseEntity<Map<String, List<SkillSummaryDto>>> getRelatedSkills(@PathVariable String slug) {
        return ResponseEntity.ok(Map.of("skills", skillService.getRelatedSkills(slug)));
    }

    @GetMapping("/collections")
    public ResponseEntity<Map<String, List<CollectionDto>>> getCollections() {
        return ResponseEntity.ok(Map.of("collections", skillService.getCollections()));
    }

    @PostMapping("/skills/{slug}/install")
    public ResponseEntity<Map<String, Integer>> recordInstall(@PathVariable String slug) {
        return ResponseEntity.ok(skillService.recordInstall(slug));
    }

    @PutMapping("/skills/{slug}")
    public ResponseEntity<SkillDetailDto> updateSkill(
        @PathVariable String slug,
        @Valid @RequestBody SkillUpdateRequest req,
        Authentication authentication
    ) {
        return ResponseEntity.ok(skillService.updateSkill(slug, req, authentication.getName()));
    }

    @DeleteMapping("/skills/{slug}")
    public ResponseEntity<Void> deleteSkill(@PathVariable String slug, Authentication authentication) {
        skillService.deleteSkill(slug, authentication.getName());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/skills/{slug}/files")
    public ResponseEntity<Map<String, List<SkillFileDto>>> getSkillFiles(@PathVariable String slug) {
        return ResponseEntity.ok(Map.of("files", skillService.getSkillFiles(slug)));
    }

    @GetMapping("/skills/{slug}/versions")
    public ResponseEntity<Map<String, List<SkillVersionDto>>> getVersionHistory(@PathVariable String slug) {
        return ResponseEntity.ok(Map.of("versions", skillService.getVersionHistory(slug)));
    }

    @PostMapping("/skills/{slug}/report")
    public ResponseEntity<Map<String, Boolean>> reportSkill(
        @PathVariable String slug,
        @RequestBody Map<String, String> body,
        Authentication authentication
    ) {
        String reason = body.getOrDefault("reason", "");
        return ResponseEntity.ok(skillService.reportSkill(slug, authentication.getName(), reason));
    }

    @PostMapping("/skills")
    public ResponseEntity<SkillPublishResponse> publishSkill(
        @Valid @RequestBody SkillPublishRequest req,
        Authentication authentication
    ) {
        String userId = authentication.getName();
        return ResponseEntity.status(HttpStatus.CREATED).body(skillService.publishSkill(req, userId));
    }
}
