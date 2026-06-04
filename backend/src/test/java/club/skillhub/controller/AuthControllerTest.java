package club.skillhub.controller;

import club.skillhub.entity.Category;
import club.skillhub.entity.Skill;
import club.skillhub.repository.CategoryRepository;
import club.skillhub.repository.SkillRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class AuthControllerTest {

    private static final String EMAIL    = "phase3@skillhub.dev";
    private static final String PASSWORD = "password123";
    private static final String NAME     = "Phase3 User";

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired CategoryRepository categoryRepo;
    @Autowired SkillRepository skillRepo;

    private String testSkillId;
    private String authToken;

    @BeforeAll
    void seedSkill() {
        Category cat = categoryRepo.save(Category.builder()
            .id("auth-cat-01").name("AuthTestCat").slug("auth-cat").build());
        Skill skill = skillRepo.save(Skill.builder()
            .id("auth-skill-01").slug("auth-test-skill").name("Auth Test Skill")
            .description("Skill used in auth integration tests")
            .category(cat).tags(List.of()).author("test").version("1.0.0")
            .installCount(0).installs24h(0).compatibleTools(List.of("claude"))
            .content("# Test").createdAt(LocalDateTime.now()).updatedAt(LocalDateTime.now())
            .build());
        testSkillId = skill.getId();
    }

    // ── 註冊 ────────────────────────────────────────────────────────────────

    @Test @Order(1)
    void register_validRequest_returns201WithToken() throws Exception {
        mvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("email", EMAIL, "password", PASSWORD, "displayName", NAME))))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.token", notNullValue()))
            .andExpect(jsonPath("$.user.email", is(EMAIL)))
            .andExpect(jsonPath("$.user.displayName", is(NAME)));
    }

    @Test @Order(2)
    void register_duplicateEmail_returns409() throws Exception {
        mvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("email", EMAIL, "password", PASSWORD, "displayName", NAME))))
            .andExpect(status().isConflict());
    }

    @Test @Order(3)
    void register_shortPassword_returns400() throws Exception {
        mvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("email", "other@test.com", "password", "short", "displayName", "X"))))
            .andExpect(status().isBadRequest());
    }

    // ── 登入 ────────────────────────────────────────────────────────────────

    @Test @Order(4)
    void login_validCredentials_returns200AndStoresToken() throws Exception {
        String resp = mvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("email", EMAIL, "password", PASSWORD))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.token", notNullValue()))
            .andReturn().getResponse().getContentAsString();
        authToken = mapper.readTree(resp).get("token").asText();
    }

    @Test @Order(5)
    void login_wrongPassword_returns401() throws Exception {
        mvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("email", EMAIL, "password", "wrongpass"))))
            .andExpect(status().isUnauthorized());
    }

    @Test @Order(6)
    void login_nonExistentEmail_returns401() throws Exception {
        mvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("email", "nobody@test.com", "password", PASSWORD))))
            .andExpect(status().isUnauthorized());
    }

    // ── JWT / /me ───────────────────────────────────────────────────────────

    @Test @Order(7)
    void getMe_noToken_returns401() throws Exception {
        mvc.perform(get("/api/v1/auth/me"))
            .andExpect(status().isUnauthorized());
    }

    @Test @Order(8)
    void getMe_validToken_returns200WithUser() throws Exception {
        mvc.perform(get("/api/v1/auth/me").header("Authorization", "Bearer " + authToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.email", is(EMAIL)))
            .andExpect(jsonPath("$.displayName", is(NAME)));
    }

    @Test @Order(9)
    void getMe_invalidToken_returns401() throws Exception {
        mvc.perform(get("/api/v1/auth/me").header("Authorization", "Bearer bad.token.here"))
            .andExpect(status().isUnauthorized());
    }

    // ── 收藏 ────────────────────────────────────────────────────────────────

    @Test @Order(10)
    void addFavorite_noAuth_returns401() throws Exception {
        mvc.perform(post("/api/v1/users/me/favorites/" + testSkillId))
            .andExpect(status().isUnauthorized());
    }

    @Test @Order(11)
    void addFavorite_withAuth_returns200Favorited() throws Exception {
        mvc.perform(post("/api/v1/users/me/favorites/" + testSkillId)
                .header("Authorization", "Bearer " + authToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.favorited", is(true)));
    }

    @Test @Order(12)
    void getFavorites_withAuth_returnsAddedSkill() throws Exception {
        mvc.perform(get("/api/v1/users/me/favorites")
                .header("Authorization", "Bearer " + authToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.skills", hasSize(greaterThanOrEqualTo(1))))
            .andExpect(jsonPath("$.skills[*].id", hasItem(testSkillId)));
    }

    @Test @Order(13)
    void removeFavorite_withAuth_returns200NotFavorited() throws Exception {
        mvc.perform(delete("/api/v1/users/me/favorites/" + testSkillId)
                .header("Authorization", "Bearer " + authToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.favorited", is(false)));
    }

    @Test @Order(14)
    void getFavorites_afterRemove_returnsEmptyList() throws Exception {
        mvc.perform(get("/api/v1/users/me/favorites")
                .header("Authorization", "Bearer " + authToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.skills", hasSize(0)));
    }

    // ── helper ──────────────────────────────────────────────────────────────

    private String json(Object o) throws Exception {
        return mapper.writeValueAsString(o);
    }
}
