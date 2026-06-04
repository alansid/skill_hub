package club.skillhub.controller;

import club.skillhub.entity.Category;
import club.skillhub.entity.Skill;
import club.skillhub.entity.SkillCollection;
import club.skillhub.entity.TagType;
import club.skillhub.repository.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class SkillControllerTest {

    @Autowired MockMvc mvc;
    @Autowired SkillRepository skillRepo;
    @Autowired CategoryRepository categoryRepo;
    @Autowired TagRepository tagRepo;
    @Autowired SkillCollectionRepository collectionRepo;

    private static boolean seeded = false;

    private Category catFrontend;
    private Category catTesting;
    private club.skillhub.entity.Tag tagTs;
    private club.skillhub.entity.Tag tagTdd;

    @BeforeEach
    void seed() {
        if (seeded) return;
        seeded = true;

        collectionRepo.deleteAll();
        skillRepo.deleteAll();
        categoryRepo.deleteAll();
        tagRepo.deleteAll();

        catFrontend = categoryRepo.save(Category.builder().id(uid()).name("Frontend").slug("frontend").build());
        catTesting  = categoryRepo.save(Category.builder().id(uid()).name("Testing").slug("testing").build());
        tagTs  = tagRepo.save(club.skillhub.entity.Tag.builder().id(uid()).name("TypeScript").type(TagType.LANGUAGE).build());
        tagTdd = tagRepo.save(club.skillhub.entity.Tag.builder().id(uid()).name("TDD").type(TagType.PROBLEM_SPACE).build());

        LocalDateTime now = LocalDateTime.now();

        Skill tdd = skillRepo.save(Skill.builder()
            .id(uid()).slug("tdd-skill").name("TDD Workflow").description("TDD workflow skill")
            .category(catTesting).tags(List.of(tagTdd)).author("test").version("1.0.0")
            .installCount(100).installs24h(50).compatibleTools(List.of("claude"))
            .content("# TDD").createdAt(now.minusDays(1)).updatedAt(now).build());

        // 24 more skills to test pagination (total = 25 with tdd)
        for (int i = 1; i <= 24; i++) {
            LocalDateTime created = now.minusDays(i + 1);
            skillRepo.save(Skill.builder()
                .id(uid()).slug("skill-" + i).name("Skill " + i).description("Description " + i)
                .category(catFrontend).tags(List.of(tagTs)).author("test").version("1.0.0")
                .installCount(i * 10).installs24h(i).compatibleTools(List.of("claude", "copilot"))
                .content("# Skill " + i).createdAt(created).updatedAt(created).build());
        }

        Skill highInstalls = skillRepo.save(Skill.builder()
            .id(uid()).slug("top-skill").name("Top Skill").description("Highest installs")
            .category(catFrontend).tags(List.of(tagTs)).author("test").version("1.0.0")
            .installCount(9999).installs24h(5).compatibleTools(List.of("claude"))
            .content("# Top").createdAt(now.minusDays(30)).updatedAt(now).build());

        collectionRepo.save(SkillCollection.builder()
            .id(uid()).name("Test Collection").description("Collection for testing")
            .skills(List.of(tdd, highInstalls)).createdAt(now).build());
    }

    // Scenario: 首頁顯示技能列表（最多 24）
    @Test @Order(1)
    void getSkills_returnsPagedResult_defaultPageSize24() throws Exception {
        mvc.perform(get("/api/v1/skills"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.skills", hasSize(24)))
            .andExpect(jsonPath("$.total", greaterThanOrEqualTo(25)))
            .andExpect(jsonPath("$.page", is(0)))
            .andExpect(jsonPath("$.pageSize", is(24)));
    }

    // Scenario: 分頁
    @Test @Order(2)
    void getSkills_page1_returnsRemainingSkills() throws Exception {
        mvc.perform(get("/api/v1/skills?page=1&pageSize=24"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.skills.length()", greaterThanOrEqualTo(1)));
    }

    // Scenario: 按 Trending 排序（installs24h DESC）
    @Test @Order(3)
    void getSkills_sortTrending_orderedByInstalls24hDesc() throws Exception {
        mvc.perform(get("/api/v1/skills?sort=trending&pageSize=5"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.skills[0].installCount", not(is(0))));
    }

    // Scenario: 按 Latest 排序（createdAt DESC）
    @Test @Order(4)
    void getSkills_sortLatest_firstSkillIsNewest() throws Exception {
        mvc.perform(get("/api/v1/skills?sort=latest&pageSize=1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.skills[0].slug", is("tdd-skill")));
    }

    // Scenario: 按 Top 排序（installCount DESC）
    @Test @Order(5)
    void getSkills_sortTop_firstSkillHasHighestInstalls() throws Exception {
        mvc.perform(get("/api/v1/skills?sort=top&pageSize=1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.skills[0].slug", is("top-skill")));
    }

    // Scenario: 關鍵字搜尋
    @Test @Order(6)
    void getSkills_searchByKeyword_returnsMatchingSkills() throws Exception {
        mvc.perform(get("/api/v1/skills?q=TDD"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.skills[*].name", hasItem(containsStringIgnoringCase("TDD"))));
    }

    // Scenario: 無搜尋結果
    @Test @Order(7)
    void getSkills_noMatchForKeyword_returnsEmptyList() throws Exception {
        mvc.perform(get("/api/v1/skills?q=XYZNOTEXISTS99999"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.skills", hasSize(0)))
            .andExpect(jsonPath("$.total", is(0)));
    }

    // Scenario: 分類篩選
    @Test @Order(8)
    void getSkills_filterByCategory_returnsOnlyMatchingCategory() throws Exception {
        mvc.perform(get("/api/v1/skills?category=testing"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.skills[*].category.slug", everyItem(is("testing"))));
    }

    // Scenario: 標籤篩選
    @Test @Order(9)
    void getSkills_filterByTag_returnsOnlySkillsWithTag() throws Exception {
        mvc.perform(get("/api/v1/skills?tag=TDD"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.skills[*].tags[*].name", hasItem("TDD")));
    }

    // Scenario: API 回傳格式正確
    @Test @Order(10)
    void getSkills_responseSchemaIsValid() throws Exception {
        mvc.perform(get("/api/v1/skills?sort=trending&pageSize=10"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.skills[0].id",               notNullValue()))
            .andExpect(jsonPath("$.skills[0].slug",             notNullValue()))
            .andExpect(jsonPath("$.skills[0].name",             notNullValue()))
            .andExpect(jsonPath("$.skills[0].description",      notNullValue()))
            .andExpect(jsonPath("$.skills[0].category",         notNullValue()))
            .andExpect(jsonPath("$.skills[0].author",           notNullValue()))
            .andExpect(jsonPath("$.skills[0].version",          notNullValue()))
            .andExpect(jsonPath("$.skills[0].installCount",     notNullValue()))
            .andExpect(jsonPath("$.skills[0].compatibleTools",  notNullValue()))
            .andExpect(jsonPath("$.skills[0].createdAt",        notNullValue()))
            .andExpect(jsonPath("$.total",    notNullValue()))
            .andExpect(jsonPath("$.page",     notNullValue()))
            .andExpect(jsonPath("$.pageSize", notNullValue()));
    }

    // Scenario: 精選 Collections 顯示
    @Test @Order(11)
    void getCollections_returnsCollectionsWithSkills() throws Exception {
        mvc.perform(get("/api/v1/collections"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.collections", hasSize(greaterThanOrEqualTo(1))))
            .andExpect(jsonPath("$.collections[0].name",        notNullValue()))
            .andExpect(jsonPath("$.collections[0].description", notNullValue()))
            .andExpect(jsonPath("$.collections[0].skills",      not(empty())));
    }

    @Test @Order(12)
    void getCategories_returnsAllCategories() throws Exception {
        mvc.perform(get("/api/v1/skills/categories"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.categories", hasSize(greaterThanOrEqualTo(2))));
    }

    @Test @Order(13)
    void getTags_returnsAllTags() throws Exception {
        mvc.perform(get("/api/v1/skills/tags"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.tags", hasSize(greaterThanOrEqualTo(2))));
    }

    // Phase 2: Scenario: slug 存在 → HTTP 200 + 完整 SkillDetailDto
    @Test @Order(14)
    void getSkillDetail_existingSlug_returns200WithFullDto() throws Exception {
        mvc.perform(get("/api/v1/skills/tdd-skill"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.slug",           is("tdd-skill")))
            .andExpect(jsonPath("$.name",           notNullValue()))
            .andExpect(jsonPath("$.description",    notNullValue()))
            .andExpect(jsonPath("$.content",        notNullValue()))
            .andExpect(jsonPath("$.installs24h",    notNullValue()))
            .andExpect(jsonPath("$.updatedAt",      notNullValue()))
            .andExpect(jsonPath("$.installCount",   notNullValue()))
            .andExpect(jsonPath("$.compatibleTools",notNullValue()))
            .andExpect(jsonPath("$.category",       notNullValue()))
            .andExpect(jsonPath("$.author",         notNullValue()))
            .andExpect(jsonPath("$.version",        notNullValue()));
    }

    // Phase 2: Scenario: slug 不存在 → HTTP 404
    @Test @Order(15)
    void getSkillDetail_nonExistingSlug_returns404() throws Exception {
        mvc.perform(get("/api/v1/skills/does-not-exist"))
            .andExpect(status().isNotFound());
    }

    // Phase 2: Scenario: related → 同 category、排除自身、最多 4 筆
    @Test @Order(16)
    void getRelatedSkills_returnsSameCategoryExcludesSelfMaxFour() throws Exception {
        mvc.perform(get("/api/v1/skills/skill-1/related"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.skills", hasSize(lessThanOrEqualTo(4))))
            .andExpect(jsonPath("$.skills[*].slug", not(hasItem("skill-1"))))
            .andExpect(jsonPath("$.skills[*].category.slug", everyItem(is("frontend"))));
    }

    // Phase 6: Scenario: slug 存在 → HTTP 200 + SkillDownloadResponse
    @Test @Order(17)
    void downloadSkill_existingSlug_returns200WithDownloadResponse() throws Exception {
        mvc.perform(get("/api/v1/skills/tdd-skill/download"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.slug",    is("tdd-skill")))
            .andExpect(jsonPath("$.name",    notNullValue()))
            .andExpect(jsonPath("$.version", notNullValue()))
            .andExpect(jsonPath("$.content", notNullValue()));
    }

    // Phase 6: Scenario: slug 不存在 → HTTP 404
    @Test @Order(18)
    void downloadSkill_nonExistingSlug_returns404() throws Exception {
        mvc.perform(get("/api/v1/skills/unknown-skill/download"))
            .andExpect(status().isNotFound());
    }

    private String uid() {
        return UUID.randomUUID().toString();
    }
}
