package club.skillhub.service;

import club.skillhub.dto.*;
import club.skillhub.entity.*;
import club.skillhub.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class FavoriteService {

    private final UserFavoriteRepository favoriteRepository;
    private final UserRepository userRepository;
    private final SkillRepository skillRepository;

    @Transactional
    public void addFavorite(String userId, String skillId) {
        if (favoriteRepository.existsByUser_IdAndSkill_Id(userId, skillId)) return;
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        Skill skill = skillRepository.findById(skillId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Skill not found"));
        favoriteRepository.save(UserFavorite.builder()
            .user(user).skill(skill).savedAt(LocalDateTime.now()).build());
    }

    @Transactional
    public void removeFavorite(String userId, String skillId) {
        favoriteRepository.findByUser_IdAndSkill_Id(userId, skillId)
            .ifPresent(favoriteRepository::delete);
    }

    @Transactional(readOnly = true)
    public List<SkillSummaryDto> getFavorites(String userId) {
        return favoriteRepository.findByUser_Id(userId).stream()
            .map(f -> toSummaryDto(f.getSkill()))
            .toList();
    }

    private SkillSummaryDto toSummaryDto(Skill s) {
        CategoryDto cat = new CategoryDto(
            s.getCategory().getId(), s.getCategory().getName(), s.getCategory().getSlug());
        List<TagDto> tags = s.getTags().stream()
            .map(t -> new TagDto(t.getId(), t.getName(), t.getType().name()))
            .toList();
        return new SkillSummaryDto(
            s.getId(), s.getSlug(), s.getName(), s.getDescription(),
            cat, tags, s.getAuthor(), s.getVersion(),
            s.getInstallCount(), s.getCompatibleTools(), s.getCreatedAt().toString(),
            s.getStatus().name(), s.getAvgRating(), s.getRatingCount()
        );
    }
}
