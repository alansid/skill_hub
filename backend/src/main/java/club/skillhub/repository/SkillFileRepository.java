package club.skillhub.repository;

import club.skillhub.entity.SkillFile;
import jakarta.transaction.Transactional;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SkillFileRepository extends JpaRepository<SkillFile, String> {
    List<SkillFile> findBySkill_Id(String skillId);

    @Transactional
    void deleteBySkill_Id(String skillId);
}
