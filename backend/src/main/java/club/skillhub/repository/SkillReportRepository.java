package club.skillhub.repository;

import club.skillhub.entity.SkillReport;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SkillReportRepository extends JpaRepository<SkillReport, String> {
    boolean existsBySkill_IdAndReporter_Id(String skillId, String reporterId);
}
