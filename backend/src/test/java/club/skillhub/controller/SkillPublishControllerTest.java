package club.skillhub.controller;

import club.skillhub.entity.Category;
import club.skillhub.repository.CategoryRepository;
import club.skillhub.repository.SkillRepository;
import club.skillhub.repository.TagRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class SkillPublishControllerTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired CategoryRepository categoryRepo;
    @Autowired SkillRepository skillRepo;
    @Autowired TagRepository tagRepo;

    private String authToken;
    private String categorySlug;

    @BeforeAll
    void setup() throws Exception {
        categoryRepo.save(Category.builder()
            .id("pub-cat-01").name("Publishing").slug("publishing").build());
        categorySlug = "publishing";

        // 註冊取得 JWT
        var regBody = Map.of("email", "publisher@test.dev", "password", "pass1234", "displayName", "Publisher");
        var result = mvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(regBody)))
            .andReturn();
        authToken = mapper.readTree(result.getResponse().getContentAsString()).get("token").asText();
    }

    Map<String, Object> validRequest() {
        return Map.of(
            "slug", "my-test-skill",
            "name", "My Test Skill",
            "description", "A skill for testing the publish endpoint.",
            "version", "1.0.0",
            "categorySlug", categorySlug,
            "tagSlugs", List.of(),
            "compatibleTools", List.of("claude"),
            "content", "# My Test Skill\nThis is the content."
        );
    }

    // Scenario: 成功發布技能 → HTTP 201
    @Test @Order(1)
    void publish_validRequest_returns201() throws Exception {
        mvc.perform(post("/api/v1/skills")
                .header("Authorization", "Bearer " + authToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(validRequest())))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.slug").value("my-test-skill"))
            .andExpect(jsonPath("$.name").value("My Test Skill"))
            .andExpect(jsonPath("$.version").value("1.0.0"))
            .andExpect(jsonPath("$.author").value("Publisher"));
    }

    // Scenario: Slug 已存在 → HTTP 409
    @Test @Order(2)
    void publish_duplicateSlug_returns409() throws Exception {
        mvc.perform(post("/api/v1/skills")
                .header("Authorization", "Bearer " + authToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(validRequest())))
            .andExpect(status().isConflict());
    }

    // Scenario: 缺少必填欄位 → HTTP 400
    @Test @Order(3)
    void publish_missingName_returns400() throws Exception {
        var body = Map.of(
            "slug", "another-skill",
            "description", "desc",
            "version", "1.0.0",
            "categorySlug", categorySlug,
            "compatibleTools", List.of("claude"),
            "content", "# content"
        );
        mvc.perform(post("/api/v1/skills")
                .header("Authorization", "Bearer " + authToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(body)))
            .andExpect(status().isBadRequest());
    }

    // Scenario: slug 格式不合法 → HTTP 400
    @Test @Order(4)
    void publish_invalidSlugFormat_returns400() throws Exception {
        var body = new java.util.HashMap<>(validRequest());
        body.put("slug", "Invalid Slug!!!");
        mvc.perform(post("/api/v1/skills")
                .header("Authorization", "Bearer " + authToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(body)))
            .andExpect(status().isBadRequest());
    }

    // Scenario: 未驗證 → HTTP 401
    @Test @Order(5)
    void publish_noToken_returns401() throws Exception {
        mvc.perform(post("/api/v1/skills")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(validRequest())))
            .andExpect(status().isUnauthorized());
    }
}
