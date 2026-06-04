package club.skillhub.repository;

import club.skillhub.entity.SkillVersion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SkillVersionRepository extends JpaRepository<SkillVersion, String> {
    List<SkillVersion> findBySkill_IdOrderByCreatedAtDesc(String skillId);
}
