package club.skillhub.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "skill_files")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SkillFile {

    @Id
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "skill_id", nullable = false)
    private Skill skill;

    @Column(nullable = false, length = 255)
    private String path;

    @Column(length = 4000, nullable = false)
    private String content;
}
