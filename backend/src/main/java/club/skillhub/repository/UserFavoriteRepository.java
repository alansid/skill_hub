package club.skillhub.repository;

import club.skillhub.entity.UserFavorite;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserFavoriteRepository extends JpaRepository<UserFavorite, Long> {
    Optional<UserFavorite> findByUser_IdAndSkill_Id(String userId, String skillId);
    List<UserFavorite> findByUser_Id(String userId);
    boolean existsByUser_IdAndSkill_Id(String userId, String skillId);
}
