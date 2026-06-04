package club.skillhub.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "skill_reports",
    uniqueConstraints = @UniqueConstraint(columnNames = {"skill_id", "reporter_id"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SkillReport {

    @Id
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "skill_id", nullable = false)
    private Skill skill;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reporter_id", nullable = false)
    private User reporter;

    @Column(length = 500, nullable = false)
    private String reason;

    @Column(nullable = false)
    private LocalDateTime createdAt;
}
