package club.skillhub.service;

import club.skillhub.config.JwtUtil;
import club.skillhub.dto.*;
import club.skillhub.entity.*;
import club.skillhub.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService implements UserDetailsService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthResponse register(RegisterRequest req) {
        if (userRepository.existsByEmail(req.email())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
        }
        User user = User.builder()
            .id(UUID.randomUUID().toString())
            .email(req.email())
            .password(passwordEncoder.encode(req.password()))
            .displayName(req.displayName())
            .provider(AuthProvider.LOCAL)
            .createdAt(LocalDateTime.now())
            .build();
        userRepository.save(user);
        return new AuthResponse(jwtUtil.generateToken(user.getId()), toDto(user));
    }

    public AuthResponse login(LoginRequest req) {
        User user = userRepository.findByEmail(req.email())
            .filter(u -> u.getPassword() != null && passwordEncoder.matches(req.password(), u.getPassword()))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));
        return new AuthResponse(jwtUtil.generateToken(user.getId()), toDto(user));
    }

    public CurrentUserDto getMe(String userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        return toDto(user);
    }

    @Override
    public UserDetails loadUserByUsername(String userId) throws UsernameNotFoundException {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new UsernameNotFoundException("User not found: " + userId));
        return org.springframework.security.core.userdetails.User.builder()
            .username(user.getId())
            .password(user.getPassword() != null ? user.getPassword() : "")
            .authorities("ROLE_USER")
            .build();
    }

    private CurrentUserDto toDto(User user) {
        return new CurrentUserDto(
            user.getId(), user.getEmail(), user.getDisplayName(),
            user.getAvatarUrl(), user.getProvider().name()
        );
    }
}
