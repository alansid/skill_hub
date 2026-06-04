package club.skillhub.repository;

import club.skillhub.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CategoryRepository extends JpaRepository<Category, String> {
    java.util.Optional<Category> findBySlug(String slug);
}
