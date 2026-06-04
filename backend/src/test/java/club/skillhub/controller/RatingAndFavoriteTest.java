package club.skillhub.controller;

import club.skillhub.entity.*;
import club.skillhub.repository.*;
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
class RatingAndFavoriteTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired CategoryRepository categoryRepo;
    @Autowired SkillRepository skillRepo;

    private String authToken;
    private String skillId;
    private static final String SKILL_SLUG = "rate-test-skill";

    @BeforeAll
    void setup() throws Exception {
        Category cat = categoryRepo.save(Category.builder()
            .id("rate-cat-01").name("RateCat").slug("rate-cat").build());

        Skill skill = skillRepo.save(Skill.builder()
            .id("rate-skill-01").slug(SKILL_SLUG).name("Rate Test Skill")
            .description("Used for rating integration tests")
            .category(cat).tags(List.of()).author("test").version("1.0.0")
            .installCount(0).installs24h(0).compatibleTools(List.of("claude"))
            .content("# Test").status(SkillStatus.APPROVED)
            .createdAt(LocalDateTime.now()).updatedAt(LocalDateTime.now()).build());
        skillId = skill.getId();

        var regBody = Map.of("email", "rater@test.dev", "password", "pass1234", "displayName", "Rater");
        var result = mvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(regBody)))
            .andReturn();
        authToken = mapper.readTree(result.getResponse().getContentAsString()).get("token").asText();
    }

    // ── Rating ───────────────────────────────────────────────────────────────

    @Test @Order(1)
    void getRatings_noAuth_returns200() throws Exception {
        mvc.perform(get("/api/v1/skills/" + SKILL_SLUG + "/ratings"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.ratings", hasSize(0)))
            .andExpect(jsonPath("$.avgRating", is(0.0)))
            .andExpect(jsonPath("$.ratingCount", is(0)));
    }

    @Test @Order(2)
    void submitRating_noAuth_returns401() throws Exception {
        mvc.perform(post("/api/v1/skills/" + SKILL_SLUG + "/ratings")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("rating", 5))))
            .andExpect(status().isUnauthorized());
    }

    @Test @Order(3)
    void submitRating_withAuth_returns201() throws Exception {
        mvc.perform(post("/api/v1/skills/" + SKILL_SLUG + "/ratings")
                .header("Authorization", "Bearer " + authToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("rating", 5, "comment", "Great skill!"))))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.rating", is(5)))
            .andExpect(jsonPath("$.displayName", is("Rater")));
    }

    @Test @Order(4)
    void submitRating_duplicate_returns409() throws Exception {
        mvc.perform(post("/api/v1/skills/" + SKILL_SLUG + "/ratings")
                .header("Authorization", "Bearer " + authToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("rating", 3))))
            .andExpect(status().isConflict());
    }

    @Test @Order(5)
    void getRatings_afterSubmit_returnsRating() throws Exception {
        mvc.perform(get("/api/v1/skills/" + SKILL_SLUG + "/ratings"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.ratings", hasSize(1)))
            .andExpect(jsonPath("$.avgRating", is(5.0)))
            .andExpect(jsonPath("$.ratingCount", is(1)));
    }

    @Test @Order(6)
    void updateRating_withAuth_returns200() throws Exception {
        mvc.perform(put("/api/v1/skills/" + SKILL_SLUG + "/ratings/me")
                .header("Authorization", "Bearer " + authToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("rating", 4))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.rating", is(4)));
    }

    @Test @Order(7)
    void deleteRating_withAuth_returns204() throws Exception {
        mvc.perform(delete("/api/v1/skills/" + SKILL_SLUG + "/ratings/me")
                .header("Authorization", "Bearer " + authToken))
            .andExpect(status().isNoContent());
    }

    // ── Favorite ─────────────────────────────────────────────────────────────

    @Test @Order(8)
    void addFavorite_withAuth_returns200() throws Exception {
        mvc.perform(post("/api/v1/users/me/favorites/" + skillId)
                .header("Authorization", "Bearer " + authToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.favorited", is(true)));
    }

    @Test @Order(9)
    void getFavorites_withAuth_containsSkill() throws Exception {
        mvc.perform(get("/api/v1/users/me/favorites")
                .header("Authorization", "Bearer " + authToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.skills[*].id", hasItem(skillId)));
    }

    @Test @Order(10)
    void removeFavorite_withAuth_returns200() throws Exception {
        mvc.perform(delete("/api/v1/users/me/favorites/" + skillId)
                .header("Authorization", "Bearer " + authToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.favorited", is(false)));
    }
}
