package club.skillhub.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "skills")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Skill {

    @Id
    private String id;

    @Column(unique = true, nullable = false)
    private String slug;

    @Column(nullable = false)
    private String name;

    @Column(length = 4000, nullable = false)
    private String description;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "skill_tags",
        joinColumns = @JoinColumn(name = "skill_id"),
        inverseJoinColumns = @JoinColumn(name = "tag_id")
    )
    @Builder.Default
    private List<Tag> tags = new ArrayList<>();

    @Column(nullable = false)
    private String author;

    private String authorId;

    @Column(nullable = false)
    private String version;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private SkillStatus status = SkillStatus.PENDING;

    @Column(nullable = false)
    @Builder.Default
    private int reportCount = 0;

    @Builder.Default
    private double avgRating = 0.0;

    @Builder.Default
    private int ratingCount = 0;

    @Column(nullable = false)
    private int installCount;

    @Column(nullable = false)
    private int installs24h;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "skill_compatible_tools", joinColumns = @JoinColumn(name = "skill_id"))
    @Column(name = "tool")
    @Builder.Default
    private List<String> compatibleTools = new ArrayList<>();

    @Column(length = 4000)
    private String content;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
