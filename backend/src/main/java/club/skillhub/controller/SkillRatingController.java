package club.skillhub.controller;

import club.skillhub.dto.RatingDto;
import club.skillhub.dto.RatingRequest;
import club.skillhub.dto.RatingsPageResponse;
import club.skillhub.service.SkillRatingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/skills/{slug}/ratings")
@RequiredArgsConstructor
public class SkillRatingController {

    private final SkillRatingService ratingService;

    @GetMapping
    public ResponseEntity<RatingsPageResponse> getRatings(
        @PathVariable String slug,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "10") int pageSize
    ) {
        return ResponseEntity.ok(ratingService.getRatings(slug, page, pageSize));
    }

    @PostMapping
    public ResponseEntity<RatingDto> submitRating(
        @PathVariable String slug,
        @Valid @RequestBody RatingRequest req,
        Authentication auth
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ratingService.submitRating(slug, auth.getName(), req));
    }

    @PutMapping("/me")
    public ResponseEntity<RatingDto> updateRating(
        @PathVariable String slug,
        @Valid @RequestBody RatingRequest req,
        Authentication auth
    ) {
        return ResponseEntity.ok(ratingService.updateRating(slug, auth.getName(), req));
    }

    @DeleteMapping("/me")
    public ResponseEntity<Void> deleteRating(@PathVariable String slug, Authentication auth) {
        ratingService.deleteRating(slug, auth.getName());
        return ResponseEntity.noContent().build();
    }
}
