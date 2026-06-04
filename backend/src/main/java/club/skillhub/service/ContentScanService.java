package club.skillhub.service;

import org.springframework.stereotype.Service;

import java.util.List;
import java.util.regex.Pattern;

@Service
public class ContentScanService {

    public enum RiskLevel { SAFE, LOW, HIGH }

    public record ScanResult(RiskLevel risk, String reason) {}

    private static final List<Pattern> HIGH_RISK = List.of(
        Pattern.compile("\\brm\\s+-rf\\b", Pattern.CASE_INSENSITIVE),
        Pattern.compile("\\bdel\\s+/[fqs]", Pattern.CASE_INSENSITIVE),
        Pattern.compile("\\bformat\\s+[a-zA-Z]:", Pattern.CASE_INSENSITIVE),
        Pattern.compile("<script[\\s>]", Pattern.CASE_INSENSITIVE),
        Pattern.compile("javascript\\s*:", Pattern.CASE_INSENSITIVE),
        Pattern.compile("\\beval\\s*\\(", Pattern.CASE_INSENSITIVE)
    );

    private static final List<Pattern> LOW_RISK = List.of(
        Pattern.compile("curl\\s+https?://", Pattern.CASE_INSENSITIVE),
        Pattern.compile("fetch\\s*\\(\\s*['\"]https?://", Pattern.CASE_INSENSITIVE),
        Pattern.compile("wget\\s+https?://", Pattern.CASE_INSENSITIVE)
    );

    private static final int MAX_CONTENT_BYTES = 50 * 1024; // 50 KB

    public ScanResult scan(String content) {
        if (content != null && content.getBytes().length > MAX_CONTENT_BYTES) {
            return new ScanResult(RiskLevel.HIGH, "Content exceeds maximum allowed size (50KB)");
        }
        for (Pattern p : HIGH_RISK) {
            if (p.matcher(content).find()) {
                return new ScanResult(RiskLevel.HIGH, "Potentially dangerous command detected: " + p.pattern());
            }
        }
        for (Pattern p : LOW_RISK) {
            if (p.matcher(content).find()) {
                return new ScanResult(RiskLevel.LOW, "Content contains external URL references");
            }
        }
        return new ScanResult(RiskLevel.SAFE, null);
    }
}
