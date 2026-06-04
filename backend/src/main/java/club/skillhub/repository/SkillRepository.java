package club.skillhub.repository;

import club.skillhub.entity.Skill;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SkillRepository extends JpaRepository<Skill, String> {

    java.util.Optional<Skill> findBySlug(String slug);

    boolean existsBySlug(String slug);

    @Query("""
        SELECT s FROM Skill s
        WHERE s.category.slug = :categorySlug AND s.slug != :excludeSlug
        ORDER BY s.installs24h DESC
        """)
    java.util.List<Skill> findRelated(
        @Param("categorySlug") String categorySlug,
        @Param("excludeSlug") String excludeSlug,
        Pageable pageable
    );

    @Modifying
    @Query("UPDATE Skill s SET s.status = club.skillhub.entity.SkillStatus.APPROVED WHERE s.status = club.skillhub.entity.SkillStatus.PENDING AND s.createdAt <= :cutoff")
    int approveExpiredPending(@Param("cutoff") java.time.LocalDateTime cutoff);

    @Modifying
    @Query("UPDATE Skill s SET s.status = club.skillhub.entity.SkillStatus.SUSPENDED WHERE s.reportCount >= :threshold AND s.status = club.skillhub.entity.SkillStatus.APPROVED")
    int suspendOverReported(@Param("threshold") int threshold);

    @Modifying
    @Query("UPDATE Skill s SET s.reportCount = s.reportCount + 1 WHERE s.id = :skillId")
    int incrementReportCount(@Param("skillId") String skillId);

    @Modifying
    @Query("UPDATE Skill s SET s.installCount = s.installCount + 1, s.installs24h = s.installs24h + 1 WHERE s.slug = :slug")
    int incrementInstallCount(@Param("slug") String slug);

    @Modifying
    @Query("UPDATE Skill s SET s.installs24h = 0")
    void resetInstalls24h();

    @Query("""
        SELECT DISTINCT s FROM Skill s LEFT JOIN s.tags t
        WHERE (:q IS NULL OR LOWER(s.name) LIKE LOWER(CONCAT('%', :q, '%'))
                          OR LOWER(s.description) LIKE LOWER(CONCAT('%', :q, '%')))
          AND (:category IS NULL OR s.category.slug = :category)
          AND (:tag IS NULL OR t.name = :tag)
        """)
    Page<Skill> findWithFilters(
        @Param("q") String q,
        @Param("category") String category,
        @Param("tag") String tag,
        Pageable pageable
    );
}
