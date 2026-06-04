package club.skillhub.scheduler;

import club.skillhub.service.SkillService;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class InstallStatsScheduler {

    private final SkillService skillService;

    // Reset installs24h to 0 every day at midnight UTC
    @Scheduled(cron = "0 0 0 * * *")
    public void resetDailyInstalls() {
        skillService.resetDailyInstalls();
    }

    // Auto-approve skills pending > 24h, suspend over-reported skills — runs hourly
    @Scheduled(cron = "0 0 * * * *")
    public void runModerationTasks() {
        skillService.autoApproveExpiredPending();
        skillService.autoSuspendOverReported();
    }
}
