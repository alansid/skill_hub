package club.skillhub.service;

import club.skillhub.dto.RatingDto;
import club.skillhub.dto.RatingRequest;
import club.skillhub.dto.RatingsPageResponse;
import club.skillhub.entity.Skill;
import club.skillhub.entity.SkillRating;
import club.skillhub.entity.User;
import club.skillhub.repository.SkillRatingRepository;
import club.skillhub.repository.SkillRepository;
import club.skillhub.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SkillRatingService {

    private final SkillRatingRepository ratingRepository;
    private final SkillRepository skillRepository;
    private final UserRepository userRepository;

    @Transactional
    public RatingsPageResponse getRatings(String slug, int page, int pageSize) {
        skillRepository.findBySlug(slug)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Skill not found"));

        Page<SkillRating> result = ratingRepository.findBySkill_SlugOrderByCreatedAtDesc(slug, PageRequest.of(page, pageSize));

        Map<Integer, Long> distribution = result.getContent().stream()
            .collect(Collectors.groupingBy(SkillRating::getRating, Collectors.counting()));
        for (int i = 1; i <= 5; i++) distribution.putIfAbsent(i, 0L);

        double avg = result.getContent().stream().mapToInt(SkillRating::getRating).average().orElse(0.0);

        return new RatingsPageResponse(
            result.getContent().stream().map(this::toDto).toList(),
            result.getTotalElements(), page, pageSize,
            Math.round(avg * 10.0) / 10.0,
            (int) result.getTotalElements(),
            distribution
        );
    }

    @Transactional
    public RatingDto submitRating(String slug, String userId, RatingRequest req) {
        if (ratingRepository.existsBySkill_SlugAndUser_Id(slug, userId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Already rated");
        }
        Skill skill = skillRepository.findBySlug(slug)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Skill not found"));
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));

        SkillRating rating = SkillRating.builder()
            .id(UUID.randomUUID().toString())
            .skill(skill)
            .user(user)
            .rating(req.rating())
            .comment(req.comment())
            .createdAt(LocalDateTime.now())
            .updatedAt(LocalDateTime.now())
            .build();
        ratingRepository.save(rating);
        recalculateStats(skill);
        return toDto(rating);
    }

    @Transactional
    public RatingDto updateRating(String slug, String userId, RatingRequest req) {
        SkillRating rating = ratingRepository.findBySkill_SlugAndUser_Id(slug, userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Rating not found"));
        rating.setRating(req.rating());
        rating.setComment(req.comment());
        rating.setUpdatedAt(LocalDateTime.now());
        ratingRepository.save(rating);
        recalculateStats(rating.getSkill());
        return toDto(rating);
    }

    @Transactional
    public void deleteRating(String slug, String userId) {
        SkillRating rating = ratingRepository.findBySkill_SlugAndUser_Id(slug, userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Rating not found"));
        Skill skill = rating.getSkill();
        ratingRepository.delete(rating);
        recalculateStats(skill);
    }

    private void recalculateStats(Skill skill) {
        double avg = ratingRepository.avgRatingBySkillId(skill.getId());
        long count = ratingRepository.countBySkillId(skill.getId());
        skill.setAvgRating(Math.round(avg * 10.0) / 10.0);
        skill.setRatingCount((int) count);
        skillRepository.save(skill);
    }

    private RatingDto toDto(SkillRating r) {
        return new RatingDto(
            r.getId(), r.getUser().getId(), r.getUser().getDisplayName(),
            r.getRating(), r.getComment(),
            r.getCreatedAt().toString(),
            r.getUpdatedAt() != null ? r.getUpdatedAt().toString() : null
        );
    }
}
