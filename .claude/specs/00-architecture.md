# Feature: SkillHub — Project Architecture

## Context

SkillHub 是一個 AI 技能市集平台，讓使用者能發現、安裝、管理和發布 AI 工具技能（以 SKILL.md 格式定義）。
相容平台：Claude、GitHub Copilot、Codex、OpenCode。

## System Boundary

**In scope（Web Platform）：**
- Next.js web app（Server + Client components）
- REST API（Next.js API Routes）
- 技能資料庫（Prisma ORM）
- 使用者帳號系統
- Playground（瀏覽器內試用）
- CLI 工具（Node.js）
- Desktop App（Tauri + React）

**Out of scope：**
- 真正的 AI embedding / semantic search（Phase 1 用 full-text search 替代）
- 金流 / Credits 系統（Phase 4 以後）
- Real-time 通知

**External systems：**
- Claude API（Playground 功能）
- OAuth providers（GitHub、Google）

## Tech Stack

### Frontend

| 層 | 技術 |
|----|------|
| Framework | Angular 20+ |
| Language | TypeScript 5 |
| UI Components | Angular Material（官方，市場主流） |
| Utility Styling | Tailwind CSS v3 |
| State | Angular Signals（內建） |
| HTTP | Angular HttpClient |
| Unit Testing | Jest + Angular Testing Library |
| E2E | Playwright |
| Package manager | npm |

### Backend

| 層 | 技術 |
|----|------|
| Framework | Spring Boot 3.x |
| Language | Java 21（LTS） |
| ORM | Spring Data JPA + Hibernate |
| Database（dev） | H2 in-memory |
| Database（prod） | PostgreSQL |
| Auth | Spring Security + JWT（jjwt） |
| Build | Gradle |
| Unit Testing | JUnit 5 + Mockito |
| Integration Testing | Spring Boot Test + Testcontainers |

## 目錄結構

```
skillhub/
├── frontend/                        # Angular 20+ app
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/               # singleton services、guards、interceptors
│   │   │   │   ├── services/
│   │   │   │   └── interceptors/
│   │   │   ├── features/           # feature 模組（lazy loaded）
│   │   │   │   ├── marketplace/    # 首頁 + 搜尋
│   │   │   │   ├── skill-detail/   # 技能詳情頁
│   │   │   │   ├── playground/     # Playground
│   │   │   │   └── auth/           # 登入/註冊
│   │   │   ├── shared/             # 共用元件、pipes、directives
│   │   │   │   ├── components/
│   │   │   │   └── models/         # TypeScript interfaces
│   │   │   └── app.routes.ts       # 路由設定
│   │   ├── styles.scss             # 全域樣式 + Tailwind entry
│   │   └── environments/
│   ├── angular.json
│   └── package.json
│
└── backend/                         # Spring Boot app
    └── src/
        ├── main/
        │   ├── java/club/skillhub/
        │   │   ├── controller/     # REST Controllers
        │   │   ├── service/        # Business logic
        │   │   ├── repository/     # Spring Data JPA repositories
        │   │   ├── entity/         # JPA entities
        │   │   ├── dto/            # Request / Response DTOs
        │   │   └── config/         # Security、CORS、Swagger config
        │   └── resources/
        │       ├── application.yml
        │       ├── application-dev.yml   # H2
        │       └── application-prod.yml  # PostgreSQL
        └── test/
```

## 開發階段對應

| Phase | Spec 檔案 | 功能 |
|-------|-----------|------|
| 1 | `01-marketplace-homepage.md` | 首頁、技能列表、搜尋、篩選、Collections |
| 2 | `02-skill-detail.md` | 技能詳情頁、一鍵安裝 |
| 3 | `03-auth-account.md` | 帳號登入/註冊、收藏 |
| 4 | `04-playground.md` | Playground（Claude Agent SDK） |
| 5 | `05-skill-publishing.md` | 技能發布、版本管理 |
| 6 | `06-api-cli.md` | REST API、CLI 工具 |
| 7 | `07-desktop-app.md` | Desktop App（Tauri） |

## Implementation TODO

- [x] 前端初始化（`ng new frontend --routing --style=scss`，Angular CLI 21）
- [x] 安裝依賴：Angular Material 21, Tailwind CSS v4, @angular/animations
- [x] 後端初始化（手動 Maven pom.xml：Web, JPA, H2, Validation, Lombok）
- [x] JPA entities 設計（Phase 1：Skill, Category, Tag, SkillCollection）
- [x] 開發用 data seeder（CommandLineRunner）

## Open Questions

- [ ] 是否需要支援多語言（i18n）在 Phase 1？（暫定 Phase 1 僅中文）
- [ ] Semantic search 何時引入 embedding？（暫定 Phase 3 後）
