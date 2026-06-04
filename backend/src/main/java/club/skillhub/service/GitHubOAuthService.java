package club.skillhub.service;

import club.skillhub.config.JwtUtil;
import club.skillhub.dto.AuthResponse;
import club.skillhub.dto.CurrentUserDto;
import club.skillhub.entity.AuthProvider;
import club.skillhub.entity.User;
import club.skillhub.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class GitHubOAuthService {

    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;

    @Value("${app.github.client-id}")
    private String clientId;

    @Value("${app.github.client-secret}")
    private String clientSecret;

    @Value("${app.github.redirect-uri}")
    private String redirectUri;

    private final RestTemplate restTemplate = new RestTemplate();

    public String getAuthorizationUrl() {
        return "https://github.com/login/oauth/authorize"
            + "?client_id=" + clientId
            + "&redirect_uri=" + redirectUri
            + "&scope=user:email";
    }

    public AuthResponse exchangeCode(String code) {
        String accessToken = fetchAccessToken(code);
        Map<String, Object> profile = fetchGitHubProfile(accessToken);

        String githubId = String.valueOf(profile.get("id"));
        String login    = (String) profile.getOrDefault("login", "github-user");
        String avatar   = (String) profile.get("avatar_url");

        User user = userRepository.findByGithubId(githubId).orElseGet(() ->
            userRepository.save(User.builder()
                .id(UUID.randomUUID().toString())
                .githubId(githubId)
                .displayName(login)
                .avatarUrl(avatar)
                .provider(AuthProvider.GITHUB)
                .createdAt(LocalDateTime.now())
                .build())
        );

        CurrentUserDto dto = new CurrentUserDto(
            user.getId(), user.getEmail(), user.getDisplayName(),
            user.getAvatarUrl(), user.getProvider().name()
        );
        return new AuthResponse(jwtUtil.generateToken(user.getId()), dto);
    }

    private String fetchAccessToken(String code) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Accept", "application/json");
        Map<String, String> body = Map.of(
            "client_id", clientId,
            "client_secret", clientSecret,
            "code", code
        );
        ResponseEntity<Map<String, Object>> resp = restTemplate.exchange(
            "https://github.com/login/oauth/access_token",
            HttpMethod.POST,
            new HttpEntity<>(body, headers),
            new ParameterizedTypeReference<>() {}
        );
        Map<String, Object> respBody = resp.getBody();
        if (respBody == null || !respBody.containsKey("access_token")) {
            String error = respBody != null ? (String) respBody.get("error_description") : "no response";
            throw new RuntimeException("GitHub OAuth failed: " + error);
        }
        return (String) respBody.get("access_token");
    }

    private Map<String, Object> fetchGitHubProfile(String accessToken) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + accessToken);
        ResponseEntity<Map<String, Object>> resp = restTemplate.exchange(
            "https://api.github.com/user",
            HttpMethod.GET,
            new HttpEntity<>(headers),
            new ParameterizedTypeReference<>() {}
        );
        return resp.getBody();
    }
}
