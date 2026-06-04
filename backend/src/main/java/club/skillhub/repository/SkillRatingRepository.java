package club.skillhub.repository;

import club.skillhub.entity.SkillRating;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface SkillRatingRepository extends JpaRepository<SkillRating, String> {
    Page<SkillRating> findBySkill_SlugOrderByCreatedAtDesc(String slug, Pageable pageable);
    Optional<SkillRating> findBySkill_SlugAndUser_Id(String slug, String userId);
    boolean existsBySkill_SlugAndUser_Id(String slug, String userId);

    @Query("SELECT COALESCE(AVG(r.rating), 0) FROM SkillRating r WHERE r.skill.id = :skillId")
    double avgRatingBySkillId(@Param("skillId") String skillId);

    @Query("SELECT COUNT(r) FROM SkillRating r WHERE r.skill.id = :skillId")
    long countBySkillId(@Param("skillId") String skillId);
}
