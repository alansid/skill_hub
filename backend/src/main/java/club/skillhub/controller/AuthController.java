package club.skillhub.controller;

import club.skillhub.dto.*;
import club.skillhub.service.AuthService;
import club.skillhub.service.GitHubOAuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.net.URI;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final GitHubOAuthService gitHubOAuthService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(req));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest req) {
        return ResponseEntity.ok(authService.login(req));
    }

    @GetMapping("/github")
    public ResponseEntity<Void> githubLogin() {
        return ResponseEntity.status(HttpStatus.FOUND)
            .location(URI.create(gitHubOAuthService.getAuthorizationUrl()))
            .build();
    }

    @GetMapping("/github/callback")
    public ResponseEntity<Void> githubCallback(@RequestParam String code) {
        AuthResponse auth = gitHubOAuthService.exchangeCode(code);
        String redirect = "http://localhost:4200/auth/callback?token=" + auth.token();
        return ResponseEntity.status(HttpStatus.FOUND).location(URI.create(redirect)).build();
    }

    @GetMapping("/me")
    public ResponseEntity<CurrentUserDto> getMe(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(authService.getMe(userDetails.getUsername()));
    }
}
