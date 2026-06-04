package club.skillhub.dto;

import java.util.List;
import java.util.Map;

public record RatingsPageResponse(
    List<RatingDto> ratings,
    long total,
    int page,
    int pageSize,
    double avgRating,
    int ratingCount,
    Map<Integer, Long> distribution
) {}
