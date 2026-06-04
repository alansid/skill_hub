package club.skillhub.service;

import club.skillhub.dto.*;
import club.skillhub.entity.*;
import club.skillhub.repository.*;
import club.skillhub.service.ContentScanService.RiskLevel;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import jakarta.transaction.Transactional;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SkillService {

    private final SkillRepository skillRepository;
    private final CategoryRepository categoryRepository;
    private final TagRepository tagRepository;
    private final SkillCollectionRepository collectionRepository;
    private final UserRepository userRepository;
    private final SkillReportRepository skillReportRepository;
    private final SkillVersionRepository skillVersionRepository;
    private final SkillFileRepository skillFileRepository;
    private final ContentScanService contentScanService;

    public PagedSkillsResponse getSkills(String sort, String category, String tag, String q, int page, int pageSize) {
        Sort jpaSort = switch (sort == null ? "trending" : sort) {
            case "latest" -> Sort.by(Sort.Direction.DESC, "createdAt");
            case "top"    -> Sort.by(Sort.Direction.DESC, "installCount");
            default       -> Sort.by(Sort.Direction.DESC, "installs24h");
        };

        Pageable pageable = PageRequest.of(page, pageSize, jpaSort);

        String qParam        = (q != null && !q.isBlank())        ? q        : null;
        String categoryParam = (category != null && !category.isBlank()) ? category : null;
        String tagParam      = (tag != null && !tag.isBlank())     ? tag      : null;

        Page<Skill> result = skillRepository.findWithFilters(qParam, categoryParam, tagParam, pageable);

        List<SkillSummaryDto> dtos = result.getContent().stream()
            .map(this::toSummaryDto)
            .toList();

        return new PagedSkillsResponse(dtos, result.getTotalElements(), page, pageSize);
    }

    public List<CategoryDto> getCategories() {
        return categoryRepository.findAll().stream()
            .map(c -> new CategoryDto(c.getId(), c.getName(), c.getSlug()))
            .toList();
    }

    public List<TagDto> getTags() {
        return tagRepository.findAll().stream()
            .map(t -> new TagDto(t.getId(), t.getName(), t.getType().name()))
            .toList();
    }

    public List<CollectionDto> getCollections() {
        return collectionRepository.findAll().stream()
            .map(col -> new CollectionDto(
                col.getId(),
                col.getName(),
                col.getDescription(),
                col.getSkills().stream().map(this::toSummaryDto).toList()
            ))
            .toList();
    }

    public SkillDetailDto getSkillBySlug(String slug) {
        Skill s = skillRepository.findBySlug(slug)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Skill not found"));
        return toDetailDto(s);
    }

    @Transactional
    public SkillPublishResponse publishSkill(SkillPublishRequest req, String userId) {
        if (skillRepository.existsBySlug(req.slug())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Slug already exists");
        }

        ContentScanService.ScanResult scan = contentScanService.scan(req.content());
        if (scan.risk() == RiskLevel.HIGH) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                "Content rejected: " + scan.reason());
        }

        Category category = categoryRepository.findBySlug(req.categorySlug())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Category not found: " + req.categorySlug()));

        List<Tag> tags = req.tagSlugs().isEmpty() ? List.of()
            : tagRepository.findByNameIn(req.tagSlugs());

        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));

        Skill skill = Skill.builder()
            .id(UUID.randomUUID().toString())
            .slug(req.slug())
            .name(req.name())
            .description(req.description())
            .category(category)
            .tags(tags)
            .author(user.getDisplayName())
            .authorId(user.getId())
            .version(req.version())
            .compatibleTools(req.compatibleTools())
            .content(req.content())
            .status(SkillStatus.PENDING)
            .installCount(0)
            .installs24h(0)
            .createdAt(LocalDateTime.now())
            .build();

        skillRepository.save(skill);

        if (!req.files().isEmpty()) {
            List<SkillFile> skillFiles = req.files().stream()
                .map(f -> SkillFile.builder()
                    .id(UUID.randomUUID().toString())
                    .skill(skill)
                    .path(f.path())
                    .content(f.content())
                    .build())
                .toList();
            skillFileRepository.saveAll(skillFiles);
        }

        String warning = scan.risk() == RiskLevel.LOW ? scan.reason() : null;
        return new SkillPublishResponse(skill.getSlug(), skill.getName(), skill.getVersion(),
            skill.getAuthor(), skill.getStatus().name(), warning);
    }

    @Transactional
    public SkillDetailDto updateSkill(String slug, SkillUpdateRequest req, String userId) {
        Skill skill = skillRepository.findBySlug(slug)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Skill not found"));

        if (!userId.equals(skill.getAuthorId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not the author");
        }
        if (!isNewerVersion(req.version(), skill.getVersion())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Version must be higher than current");
        }

        // snapshot old version
        SkillVersion snapshot = SkillVersion.builder()
            .id(UUID.randomUUID().toString())
            .skill(skill)
            .version(skill.getVersion())
            .content(skill.getContent())
            .createdAt(LocalDateTime.now())
            .createdBy(userId)
            .build();
        skillVersionRepository.save(snapshot);

        if (req.description() != null) skill.setDescription(req.description());
        skill.setName(req.name());
        skill.setVersion(req.version());
        if (req.content() != null) skill.setContent(req.content());
        if (req.categorySlug() != null) {
            Category cat = categoryRepository.findBySlug(req.categorySlug())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Category not found"));
            skill.setCategory(cat);
        }
        if (req.compatibleTools() != null) skill.setCompatibleTools(req.compatibleTools());
        if (req.tagSlugs() != null && !req.tagSlugs().isEmpty()) {
            skill.setTags(tagRepository.findByNameIn(req.tagSlugs()));
        }
        skill.setUpdatedAt(LocalDateTime.now());
        skillRepository.save(skill);
        return toDetailDto(skill);
    }

    @Transactional
    public void deleteSkill(String slug, String userId) {
        Skill skill = skillRepository.findBySlug(slug)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Skill not found"));
        if (!userId.equals(skill.getAuthorId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not the author");
        }
        skillFileRepository.deleteBySkill_Id(skill.getId());
        skillRepository.delete(skill);
    }

    public List<SkillVersionDto> getVersionHistory(String slug) {
        Skill skill = skillRepository.findBySlug(slug)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Skill not found"));
        return skillVersionRepository.findBySkill_IdOrderByCreatedAtDesc(skill.getId())
            .stream()
            .map(v -> new SkillVersionDto(v.getId(), v.getVersion(), v.getCreatedAt().toString(), v.getCreatedBy()))
            .toList();
    }

    private boolean isNewerVersion(String newV, String currentV) {
        int[] n = parseSemver(newV);
        int[] c = parseSemver(currentV);
        for (int i = 0; i < 3; i++) {
            if (n[i] > c[i]) return true;
            if (n[i] < c[i]) return false;
        }
        return false;
    }

    private int[] parseSemver(String v) {
        String[] parts = v.split("\\.");
        return new int[]{ Integer.parseInt(parts[0]), Integer.parseInt(parts[1]), Integer.parseInt(parts[2]) };
    }

    @Transactional
    public Map<String, Boolean> reportSkill(String slug, String reporterId, String reason) {
        Skill skill = skillRepository.findBySlug(slug)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Skill not found"));
        User reporter = userRepository.findById(reporterId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));

        if (skillReportRepository.existsBySkill_IdAndReporter_Id(skill.getId(), reporterId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Already reported");
        }

        SkillReport report = SkillReport.builder()
            .id(UUID.randomUUID().toString())
            .skill(skill)
            .reporter(reporter)
            .reason(reason)
            .createdAt(LocalDateTime.now())
            .build();
        skillReportRepository.save(report);
        skillRepository.incrementReportCount(skill.getId());
        return Map.of("reported", true);
    }

    @Transactional
    public void autoApproveExpiredPending() {
        skillRepository.approveExpiredPending(LocalDateTime.now().minusHours(24));
    }

    @Transactional
    public void autoSuspendOverReported() {
        skillRepository.suspendOverReported(5);
    }

    @Transactional
    public Map<String, Integer> recordInstall(String slug) {
        int updated = skillRepository.incrementInstallCount(slug);
        if (updated == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Skill not found");
        }
        Skill s = skillRepository.findBySlug(slug).orElseThrow();
        return Map.of("installCount", s.getInstallCount());
    }

    @Transactional
    public void resetDailyInstalls() {
        skillRepository.resetInstalls24h();
    }

    public SkillDownloadResponse getSkillDownload(String slug) {
        Skill s = skillRepository.findBySlug(slug)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Skill not found"));
        List<SkillFileDto> files = skillFileRepository.findBySkill_Id(s.getId()).stream()
            .map(f -> new SkillFileDto(f.getPath(), f.getContent()))
            .toList();
        return new SkillDownloadResponse(s.getSlug(), s.getName(), s.getVersion(), s.getContent(), files);
    }

    public List<SkillFileDto> getSkillFiles(String slug) {
        Skill s = skillRepository.findBySlug(slug)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Skill not found"));
        return skillFileRepository.findBySkill_Id(s.getId()).stream()
            .map(f -> new SkillFileDto(f.getPath(), f.getContent()))
            .toList();
    }

    public List<SkillSummaryDto> getRelatedSkills(String slug) {
        Skill s = skillRepository.findBySlug(slug)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Skill not found"));
        return skillRepository.findRelated(s.getCategory().getSlug(), slug, PageRequest.of(0, 4))
            .stream().map(this::toSummaryDto).toList();
    }

    private SkillDetailDto toDetailDto(Skill s) {
        CategoryDto catDto = new CategoryDto(s.getCategory().getId(), s.getCategory().getName(), s.getCategory().getSlug());
        List<TagDto> tagDtos = s.getTags().stream()
            .map(t -> new TagDto(t.getId(), t.getName(), t.getType().name()))
            .toList();
        return new SkillDetailDto(
            s.getId(), s.getSlug(), s.getName(), s.getDescription(),
            catDto, tagDtos, s.getAuthor(), s.getAuthorId(), s.getVersion(),
            s.getInstallCount(), s.getInstalls24h(),
            s.getCompatibleTools(), s.getContent(),
            s.getCreatedAt().toString(),
            s.getUpdatedAt() != null ? s.getUpdatedAt().toString() : null,
            s.getStatus().name(),
            s.getAvgRating(), s.getRatingCount()
        );
    }

    private SkillSummaryDto toSummaryDto(Skill s) {
        CategoryDto catDto = new CategoryDto(s.getCategory().getId(), s.getCategory().getName(), s.getCategory().getSlug());
        List<TagDto> tagDtos = s.getTags().stream()
            .map(t -> new TagDto(t.getId(), t.getName(), t.getType().name()))
            .toList();
        return new SkillSummaryDto(
            s.getId(), s.getSlug(), s.getName(), s.getDescription(),
            catDto, tagDtos, s.getAuthor(), s.getVersion(),
            s.getInstallCount(), s.getCompatibleTools(),
            s.getCreatedAt().toString(), s.getStatus().name(),
            s.getAvgRating(), s.getRatingCount()
        );
    }
}
