package club.skillhub.repository;

import club.skillhub.entity.Tag;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TagRepository extends JpaRepository<Tag, String> {
    java.util.List<club.skillhub.entity.Tag> findByNameIn(java.util.List<String> names);
}
