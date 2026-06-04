package club.skillhub.controller;

import club.skillhub.dto.SkillSummaryDto;
import club.skillhub.service.FavoriteService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/users/me/favorites")
@RequiredArgsConstructor
public class FavoriteController {

    private final FavoriteService favoriteService;

    @GetMapping
    public ResponseEntity<Map<String, List<SkillSummaryDto>>> getFavorites(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(Map.of("skills", favoriteService.getFavorites(userDetails.getUsername())));
    }

    @PostMapping("/{skillId}")
    public ResponseEntity<Map<String, Boolean>> addFavorite(
            @PathVariable String skillId,
            @AuthenticationPrincipal UserDetails userDetails) {
        favoriteService.addFavorite(userDetails.getUsername(), skillId);
        return ResponseEntity.ok(Map.of("favorited", true));
    }

    @DeleteMapping("/{skillId}")
    public ResponseEntity<Map<String, Boolean>> removeFavorite(
            @PathVariable String skillId,
            @AuthenticationPrincipal UserDetails userDetails) {
        favoriteService.removeFavorite(userDetails.getUsername(), skillId);
        return ResponseEntity.ok(Map.of("favorited", false));
    }
}
