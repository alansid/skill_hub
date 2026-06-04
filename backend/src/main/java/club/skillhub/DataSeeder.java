package club.skillhub;

import club.skillhub.entity.*;
import club.skillhub.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final CategoryRepository categoryRepo;
    private final TagRepository tagRepo;
    private final SkillRepository skillRepo;
    private final SkillCollectionRepository collectionRepo;

    @Override
    public void run(String... args) {
        if (skillRepo.count() > 0) return;

        // ── Categories ─────────────────────────────────────────────────────────
        Category frontend   = save(Category.builder().id(uid()).name("Frontend").slug("frontend").build());
        Category testing    = save(Category.builder().id(uid()).name("Testing").slug("testing").build());
        Category devops     = save(Category.builder().id(uid()).name("DevOps").slug("devops").build());
        Category backend    = save(Category.builder().id(uid()).name("Backend").slug("backend").build());
        Category aiTools    = save(Category.builder().id(uid()).name("AI Tools").slug("ai-tools").build());

        // ── Tags ────────────────────────────────────────────────────────────────
        Tag typescript  = saveTag("TypeScript",  TagType.LANGUAGE);
        Tag javascript  = saveTag("JavaScript",  TagType.LANGUAGE);
        Tag python      = saveTag("Python",      TagType.LANGUAGE);
        Tag java        = saveTag("Java",        TagType.LANGUAGE);
        Tag claude      = saveTag("Claude",      TagType.TOOL);
        Tag copilot     = saveTag("Copilot",     TagType.TOOL);
        Tag codex       = saveTag("Codex",       TagType.TOOL);
        Tag tdd         = saveTag("TDD",         TagType.PROBLEM_SPACE);
        Tag codeReview  = saveTag("Code Review", TagType.PROBLEM_SPACE);
        Tag refactoring = saveTag("Refactoring", TagType.PROBLEM_SPACE);

        List<String> allTools = List.of("claude", "copilot", "codex", "opencode");
        List<String> claudeOnly = List.of("claude");

        // ── Skills (50 total) ───────────────────────────────────────────────────
        LocalDateTime now = LocalDateTime.now();

        List<Skill> skills = List.of(
            skill("TDD Starter", "tdd-starter", "A comprehensive TDD workflow for test-driven development in any language.", testing, List.of(tdd, typescript), "skillhub", "1.2.0", 5200, 320, allTools, now.minusDays(5)),
            skill("React Component Review", "react-component-review", "Deep code review for React components including accessibility and performance.", frontend, List.of(codeReview, typescript), "skillhub", "1.0.3", 4100, 210, allTools, now.minusDays(4)),
            skill("Spring Boot REST Guide", "spring-boot-rest-guide", "Build production-ready REST APIs with Spring Boot following best practices.", backend, List.of(java), "skillhub", "2.0.0", 3800, 190, claudeOnly, now.minusDays(30)),
            skill("Python Refactor Pro", "python-refactor-pro", "Automated refactoring suggestions for Python codebases using clean code principles.", backend, List.of(python, refactoring), "skillhub", "1.1.0", 3500, 180, allTools, now.minusDays(20)),
            skill("Angular Material Wizard", "angular-material-wizard", "Scaffold Angular Material components with accessibility and theming built-in.", frontend, List.of(typescript), "community", "1.0.0", 2900, 170, allTools, now.minusDays(2)),
            skill("CI/CD Pipeline Builder", "cicd-pipeline-builder", "Design and generate GitHub Actions or Jenkins pipelines interactively.", devops, List.of(claude), "skillhub", "1.3.0", 2700, 160, claudeOnly, now.minusDays(10)),
            skill("TypeScript Strict Mode", "typescript-strict-mode", "Migrate your TypeScript project to strict mode with guided fixes.", frontend, List.of(typescript, refactoring), "community", "1.0.1", 2600, 155, allTools, now.minusDays(7)),
            skill("Jest Test Generator", "jest-test-generator", "Generate Jest unit tests from existing TypeScript or JavaScript source files.", testing, List.of(javascript, typescript, tdd), "skillhub", "2.1.0", 2500, 150, allTools, now.minusDays(3)),
            skill("Docker Compose Helper", "docker-compose-helper", "Create and validate Docker Compose configurations for multi-service applications.", devops, List.of(claude), "community", "1.0.0", 2400, 145, claudeOnly, now.minusDays(15)),
            skill("SQL Query Optimizer", "sql-query-optimizer", "Analyze and optimize slow SQL queries with index recommendations.", backend, List.of(java), "skillhub", "1.0.0", 2300, 140, allTools, now.minusDays(25)),
            skill("Accessibility Auditor", "accessibility-auditor", "Audit HTML/React components for WCAG 2.1 compliance.", frontend, List.of(typescript, codeReview), "skillhub", "1.2.0", 2200, 135, allTools, now.minusDays(8)),
            skill("API Contract Tester", "api-contract-tester", "Validate REST APIs against OpenAPI specs with automated test generation.", testing, List.of(tdd), "community", "1.0.0", 2100, 130, allTools, now.minusDays(12)),
            skill("Kubernetes Manifest Generator", "k8s-manifest-generator", "Generate Kubernetes manifests from application descriptions.", devops, List.of(claude), "skillhub", "1.1.0", 2000, 125, claudeOnly, now.minusDays(18)),
            skill("Code Smell Detector", "code-smell-detector", "Identify and explain common code smells with refactoring suggestions.", backend, List.of(refactoring, codeReview), "community", "1.0.2", 1900, 120, allTools, now.minusDays(22)),
            skill("Vue 3 Composition API", "vue3-composition-api", "Best practices for Vue 3 Composition API with TypeScript.", frontend, List.of(typescript, javascript), "community", "1.0.0", 1800, 115, allTools, now.minusDays(35)),
            skill("Python Data Validator", "python-data-validator", "Generate Pydantic models and validators from JSON schemas.", backend, List.of(python), "skillhub", "1.0.0", 1750, 110, allTools, now.minusDays(40)),
            skill("Git Workflow Guide", "git-workflow-guide", "Enforce Git conventions with commit message templates and branch naming.", devops, List.of(claude), "skillhub", "1.0.0", 1700, 108, allTools, now.minusDays(45)),
            skill("BDD Scenario Writer", "bdd-scenario-writer", "Write Gherkin BDD scenarios from user stories.", testing, List.of(tdd, typescript), "community", "1.0.0", 1650, 105, allTools, now.minusDays(6)),
            skill("React Hook Optimizer", "react-hook-optimizer", "Analyze and optimize custom React hooks for performance.", frontend, List.of(typescript, javascript), "community", "1.1.0", 1600, 100, allTools, now.minusDays(9)),
            skill("Spring Security Config", "spring-security-config", "Generate Spring Security configurations for JWT and OAuth2.", backend, List.of(java), "skillhub", "2.0.0", 1550, 98, claudeOnly, now.minusDays(50)),
            skill("Terraform IaC Helper", "terraform-iac-helper", "Write and validate Terraform configurations for AWS/GCP/Azure.", devops, List.of(claude), "skillhub", "1.0.0", 1500, 95, claudeOnly, now.minusDays(55)),
            skill("Playwright E2E Guide", "playwright-e2e-guide", "Write Playwright end-to-end tests following page object model.", testing, List.of(typescript, tdd), "skillhub", "1.2.0", 1450, 92, allTools, now.minusDays(11)),
            skill("CSS Architecture Reviewer", "css-architecture-reviewer", "Review and improve CSS/SCSS architecture using BEM or CSS Modules.", frontend, List.of(javascript), "community", "1.0.0", 1400, 90, allTools, now.minusDays(28)),
            skill("FastAPI Scaffolder", "fastapi-scaffolder", "Scaffold FastAPI endpoints with Pydantic schemas and pytest tests.", backend, List.of(python), "community", "1.0.1", 1350, 88, allTools, now.minusDays(32)),
            skill("Prometheus Metrics Setup", "prometheus-metrics-setup", "Add Prometheus metrics instrumentation to Spring Boot or Node apps.", devops, List.of(java), "skillhub", "1.0.0", 1300, 85, allTools, now.minusDays(60)),
            skill("GraphQL Schema Designer", "graphql-schema-designer", "Design GraphQL schemas following best practices.", backend, List.of(typescript), "community", "1.0.0", 1250, 82, allTools, now.minusDays(38)),
            skill("Angular Signal Patterns", "angular-signal-patterns", "Modern Angular state management using Signals.", frontend, List.of(typescript), "skillhub", "1.0.0", 1200, 80, allTools, now.minusDays(1)),
            skill("Python Test Fixtures", "python-test-fixtures", "Generate pytest fixtures and factories for complex test setups.", testing, List.of(python, tdd), "community", "1.0.0", 1150, 78, allTools, now.minusDays(42)),
            skill("OpenAPI Generator", "openapi-generator", "Generate TypeScript SDK clients from OpenAPI 3.x specifications.", backend, List.of(typescript), "skillhub", "1.1.0", 1100, 75, allTools, now.minusDays(48)),
            skill("React Storybook Setup", "react-storybook-setup", "Configure and write Storybook stories for React components.", frontend, List.of(typescript, javascript), "community", "1.0.0", 1050, 72, allTools, now.minusDays(52)),
            skill("Database Migration Guide", "database-migration-guide", "Write safe Flyway/Liquibase migration scripts.", backend, List.of(java), "skillhub", "1.0.0", 1000, 70, claudeOnly, now.minusDays(65)),
            skill("GitHub Actions Matrix", "github-actions-matrix", "Build GitHub Actions workflows with matrix strategy for multi-environment testing.", devops, List.of(claude), "community", "1.0.0", 950, 68, allTools, now.minusDays(70)),
            skill("Vitest Unit Testing", "vitest-unit-testing", "Write fast unit tests with Vitest for Vite-based projects.", testing, List.of(typescript, javascript), "community", "1.0.0", 900, 65, allTools, now.minusDays(14)),
            skill("Next.js App Router Guide", "nextjs-app-router-guide", "Best practices for Next.js 14 App Router with TypeScript.", frontend, List.of(typescript), "skillhub", "1.0.0", 870, 62, allTools, now.minusDays(16)),
            skill("Java Stream API Guide", "java-stream-api-guide", "Master Java Stream API with functional programming patterns.", backend, List.of(java, refactoring), "community", "1.0.0", 840, 60, allTools, now.minusDays(75)),
            skill("AI Prompt Optimizer", "ai-prompt-optimizer", "Optimize prompts for Claude, GPT, and other AI models.", aiTools, List.of(claude), "skillhub", "1.0.0", 810, 58, claudeOnly, now.minusDays(3)),
            skill("Claude Context Manager", "claude-context-manager", "Manage long Claude conversations with smart context compression.", aiTools, List.of(claude), "skillhub", "2.0.0", 780, 56, claudeOnly, now.minusDays(4)),
            skill("AI Code Explainer", "ai-code-explainer", "Get clear explanations of complex code with examples.", aiTools, List.of(claude, copilot), "skillhub", "1.1.0", 750, 54, allTools, now.minusDays(7)),
            skill("Python Async Patterns", "python-async-patterns", "Write efficient async Python with asyncio best practices.", backend, List.of(python), "community", "1.0.0", 720, 52, allTools, now.minusDays(80)),
            skill("Tailwind CSS Architect", "tailwind-css-architect", "Design scalable Tailwind CSS component systems.", frontend, List.of(javascript, typescript), "community", "1.0.0", 690, 50, allTools, now.minusDays(85)),
            skill("Load Testing Setup", "load-testing-setup", "Configure k6 or JMeter load tests for REST APIs.", testing, List.of(java), "skillhub", "1.0.0", 660, 48, allTools, now.minusDays(90)),
            skill("Helm Chart Builder", "helm-chart-builder", "Create and validate Helm charts for Kubernetes deployments.", devops, List.of(claude), "community", "1.0.0", 630, 46, claudeOnly, now.minusDays(95)),
            skill("React Query Patterns", "react-query-patterns", "Efficient server state management with TanStack Query.", frontend, List.of(typescript), "community", "1.0.0", 600, 44, allTools, now.minusDays(19)),
            skill("DDD Tactical Patterns", "ddd-tactical-patterns", "Apply Domain-Driven Design tactical patterns in Java or TypeScript.", backend, List.of(java, typescript), "skillhub", "1.0.0", 570, 42, allTools, now.minusDays(100)),
            skill("Snapshot Testing Guide", "snapshot-testing-guide", "Use snapshot testing effectively with Jest.", testing, List.of(typescript, javascript), "community", "1.0.0", 540, 40, allTools, now.minusDays(23)),
            skill("AWS CDK Starter", "aws-cdk-starter", "Bootstrap AWS infrastructure with CDK in TypeScript.", devops, List.of(typescript, claude), "skillhub", "1.0.0", 510, 38, allTools, now.minusDays(105)),
            skill("Svelte Component Guide", "svelte-component-guide", "Build reactive Svelte components with TypeScript.", frontend, List.of(typescript, javascript), "community", "1.0.0", 480, 36, allTools, now.minusDays(110)),
            skill("gRPC Service Design", "grpc-service-design", "Design and implement gRPC services in Java or Go.", backend, List.of(java), "community", "1.0.0", 450, 34, allTools, now.minusDays(115)),
            skill("Security Code Reviewer", "security-code-reviewer", "Identify OWASP Top 10 vulnerabilities in code reviews.", aiTools, List.of(codeReview, claude), "skillhub", "1.0.0", 420, 32, allTools, now.minusDays(26)),
            skill("Monorepo Workspace Setup", "monorepo-workspace-setup", "Configure Nx or Turborepo monorepo for frontend projects.", devops, List.of(typescript), "community", "1.0.0", 390, 30, allTools, now.minusDays(120))
        );

        skillRepo.saveAll(skills);

        // ── Collections ─────────────────────────────────────────────────────────
        collectionRepo.saveAll(List.of(
            SkillCollection.builder()
                .id(uid()).name("TDD Starter Pack").description("Everything you need to start practising Test-Driven Development.")
                .skills(List.of(skills.get(0), skills.get(7), skills.get(11), skills.get(17), skills.get(21)))
                .createdAt(now.minusDays(3)).build(),

            SkillCollection.builder()
                .id(uid()).name("Frontend Review Workflow").description("A curated set of skills for thorough frontend code reviews and quality gates.")
                .skills(List.of(skills.get(1), skills.get(4), skills.get(6), skills.get(10), skills.get(18), skills.get(22)))
                .createdAt(now.minusDays(7)).build(),

            SkillCollection.builder()
                .id(uid()).name("AI-Powered Development").description("Supercharge your workflow with Claude-first skills.")
                .skills(List.of(skills.get(35), skills.get(36), skills.get(37), skills.get(48)))
                .createdAt(now.minusDays(1)).build()
        ));
    }

    private Skill skill(String name, String slug, String description,
                        Category category, List<Tag> tags, String author,
                        String version, int total, int h24,
                        List<String> tools, LocalDateTime createdAt) {
        return Skill.builder()
            .id(uid()).slug(slug).name(name).description(description)
            .category(category).tags(tags).author(author).version(version)
            .installCount(total).installs24h(h24).compatibleTools(tools)
            .content("# " + name + "\n\n" + description)
            .status(SkillStatus.APPROVED)
            .createdAt(createdAt).updatedAt(createdAt).build();
    }

    private Tag saveTag(String name, TagType type) {
        return tagRepo.save(Tag.builder().id(uid()).name(name).type(type).build());
    }

    private Category save(Category c) {
        return categoryRepo.save(c);
    }

    private String uid() {
        return UUID.randomUUID().toString();
    }
}
