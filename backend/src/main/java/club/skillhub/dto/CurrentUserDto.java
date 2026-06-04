package club.skillhub.dto;

public record CurrentUserDto(
    String id,
    String email,
    String displayName,
    String avatarUrl,
    String provider
) {}
