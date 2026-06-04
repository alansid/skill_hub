# Feature: 帳號系統（Phase 3）

## Context

讓使用者能以 Email/Password 或 GitHub OAuth 登入 SkillHub。
登入後可收藏技能、查看個人收藏清單，並解鎖後續 Phase 的個人化功能。

## System Boundary

**In scope：**
- Email + Password 註冊 / 登入
- GitHub OAuth 登入（redirect flow）
- JWT 發行（access token，24h 有效）
- 前端 JWT 攔截器（自動帶 Authorization header）
- Auth Guard（保護需要登入的路由）
- 技能收藏（新增 / 移除 / 查詢）
- 個人資料頁 `/profile`（顯示收藏清單）

**Out of scope（Phase 3）：**
- Refresh token / token rotation
- Google OAuth
- 忘記密碼 / Email 驗證
- 帳號刪除

**External systems：**
- GitHub OAuth App（client_id / client_secret 透過環境變數注入）

---

## Domain Model

### Backend JPA Entities

```java
// entity/User.java
User {
  id          String     // UUID
  email       String     // unique, nullable for OAuth-only users
  password    String     // BCrypt hash, nullable for OAuth-only users
  displayName String
  avatarUrl   String     // nullable
  provider    AuthProvider  // "LOCAL" | "GITHUB"
  githubId    String     // nullable, unique
  createdAt   LocalDateTime
}

// entity/UserFavorite.java  (composite PK)
UserFavorite {
  user   User   // FK → users.id
  skill  Skill  // FK → skills.id
  savedAt LocalDateTime
}
```

### Angular TypeScript Models

```ts
// shared/models/user.model.ts
interface CurrentUser {
  id: string
  email: string | null
  displayName: string
  avatarUrl: string | null
  provider: 'LOCAL' | 'GITHUB'
}

interface AuthResponse {
  token: string
  user: CurrentUser
}
```

---

## Interfaces / API Contract

### REST Endpoints

```
POST /api/v1/auth/register
  Body: { email: string, password: string, displayName: string }
  Response 201: AuthResponse
  Response 409: { "error": "Email already registered" }
  Response 400: { "error": "Validation failed", "fields": {...} }

POST /api/v1/auth/login
  Body: { email: string, password: string }
  Response 200: AuthResponse
  Response 401: { "error": "Invalid credentials" }

GET /api/v1/auth/github
  → 302 redirect to GitHub OAuth authorize URL

GET /api/v1/auth/github/callback?code=...
  → 302 redirect to frontend /auth/callback?token=<jwt>

GET /api/v1/auth/me                        (Bearer required)
  Response 200: CurrentUser
  Response 401: { "error": "Unauthorized" }

GET  /api/v1/users/me/favorites            (Bearer required)
  Response 200: { "skills": SkillSummaryDto[] }

POST /api/v1/users/me/favorites/{skillId}  (Bearer required)
  Response 200: { "favorited": true }
  Response 404: { "error": "Skill not found" }

DELETE /api/v1/users/me/favorites/{skillId} (Bearer required)
  Response 200: { "favorited": false }
```

### Java DTOs

```java
// dto/RegisterRequest.java
record RegisterRequest(
  @NotBlank @Email String email,
  @NotBlank @Size(min=8) String password,
  @NotBlank String displayName
) {}

// dto/LoginRequest.java
record LoginRequest(@NotBlank String email, @NotBlank String password) {}

// dto/AuthResponse.java
record AuthResponse(String token, CurrentUserDto user) {}

// dto/CurrentUserDto.java
record CurrentUserDto(
  String id, String email, String displayName,
  String avatarUrl, String provider
) {}
```

### Angular Services / Components（公開介面）

```ts
// core/services/auth.service.ts
register(req): Observable<AuthResponse>
login(req): Observable<AuthResponse>
loginWithGitHub(): void                 // redirects to /api/v1/auth/github
logout(): void                          // clears token + user signal
getMe(): Observable<CurrentUser>
currentUser: Signal<CurrentUser | null>
isLoggedIn: Signal<boolean>

// core/interceptors/jwt.interceptor.ts
// HttpInterceptor：若 localStorage 有 token，自動加 Authorization: Bearer <token>

// core/guards/auth.guard.ts
// CanActivateFn：未登入 → 導向 /auth/login

// features/auth/login/login.component.ts
// features/auth/register/register.component.ts
// features/auth/callback/callback.component.ts  (處理 OAuth redirect token)

// features/profile/profile.component.ts
// 顯示 currentUser info + 收藏技能列表

// core/services/favorite.service.ts
getFavorites(): Observable<{ skills: SkillSummary[] }>
addFavorite(skillId): Observable<{ favorited: boolean }>
removeFavorite(skillId): Observable<{ favorited: boolean }>
isFavorited(skillId): Signal<boolean>
```

---

## Acceptance Criteria

### Auth — 註冊

- **Given** 有效 email + password + displayName **When** POST /auth/register **Then** 201 + AuthResponse（含 JWT）
- **Given** 已存在的 email **When** POST /auth/register **Then** 409 + "Email already registered"
- **Given** password 少於 8 字元 **When** POST /auth/register **Then** 400 + validation error

### Auth — 登入

- **Given** 正確 email + password **When** POST /auth/login **Then** 200 + AuthResponse
- **Given** 錯誤密碼 **When** POST /auth/login **Then** 401 + "Invalid credentials"
- **Given** 不存在的 email **When** POST /auth/login **Then** 401 + "Invalid credentials"

### Auth — JWT 驗證

- **Given** 無 token **When** GET /auth/me **Then** 401
- **Given** 有效 token **When** GET /auth/me **Then** 200 + CurrentUserDto
- **Given** 過期或偽造 token **When** GET /auth/me **Then** 401

### 收藏

- **Given** 已登入 **When** POST /users/me/favorites/{skillId} **Then** 200 + { favorited: true }
- **Given** 已登入 **When** DELETE /users/me/favorites/{skillId} **Then** 200 + { favorited: false }
- **Given** 已登入 **When** GET /users/me/favorites **Then** 200 + 已收藏技能清單
- **Given** 未登入 **When** 任何 /users/me/favorites 端點 **Then** 401

### Frontend

- **Given** 未登入使用者進入 /profile **When** 路由解析 **Then** 重導至 /auth/login
- **Given** 登入後 **When** 進入 SkillDetail 頁 **Then** 顯示收藏按鈕（heart icon）
- **Given** 點擊收藏按鈕 **When** 成功 **Then** icon 切換為已收藏狀態
- **Given** 登入後進入首頁 **When** 頁面載入 **Then** 已收藏技能的 SkillCard heart icon 顯示為已收藏狀態（從 API 載入初始狀態，非每次重置 false）
- **Given** 登入後 **When** NavBar 顯示 **Then** 有明確「我的收藏」文字連結可進入個人頁面

---

## Implementation TODO

### Backend

- [x] Entity：User（BCrypt password, provider, githubId）
- [x] Entity：UserFavorite（composite PK, User + Skill relation）
- [x] Repository：UserRepository（findByEmail, findByGithubId）
- [x] Repository：UserFavoriteRepository（findByUserIdAndSkillId, findByUserId）
- [x] DTO：RegisterRequest, LoginRequest, AuthResponse, CurrentUserDto
- [x] Config：SecurityConfig（permitAll for auth endpoints, authenticate rest）
- [x] Config：JwtUtil（generate / validate token，jjwt）
- [x] Service：AuthService（register, login, loadUserByUsername）
- [x] Service：GitHubOAuthService（exchange code → user info → upsert User）
- [x] Service：FavoriteService（add, remove, list）
- [x] Controller：AuthController（/register, /login, /github, /github/callback, /me）
- [x] Controller：FavoriteController（GET/POST/DELETE /users/me/favorites）
- [ ] DataSeeder：新增 2 個示範用 User
- [x] Integration tests：AuthController（14 tests，覆蓋全部 Acceptance Scenarios）
- [x] Integration tests：FavoriteController（含於 AuthControllerTest）

### Frontend

- [x] Model：CurrentUser, AuthResponse（shared/models/user.model.ts）
- [x] AuthService（含 currentUser Signal）
- [x] JwtInterceptor（HttpInterceptor，自動帶 token）
- [x] AuthGuard（CanActivateFn）
- [x] Component：LoginComponent（features/auth/login/）
- [x] Component：RegisterComponent（features/auth/register/）
- [x] Component：CallbackComponent（features/auth/callback/，處理 OAuth token）
- [x] FavoriteService
- [x] Routing：/auth/login, /auth/register, /auth/callback, /profile（lazy）
- [x] ProfileComponent（features/profile/）
- [x] FavoriteButton 整合至 SkillCardComponent + SkillDetailComponent
- [x] NavBar 顯示登入狀態（登入/登出按鈕 + 用戶名，整合於各頁面 Toolbar）
- [x] Unit tests：AuthService（4 tests）, AuthGuard（2 tests）

## Open Questions

- [ ] JWT secret 是否透過 application.yml 注入？（暫定：`app.jwt.secret` 環境變數）
- [ ] GitHub OAuth callback URL 格式？（暫定：`http://localhost:8080/api/v1/auth/github/callback`）
- [ ] Token 儲存方式？（暫定：localStorage，Phase 3 簡化版；後續可改 httpOnly cookie）
