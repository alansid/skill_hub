# SkillHub Project

## Skill Auto-Discovery

Before starting any significant task (feature, bugfix, refactor, testing, etc.):

1. Use `skillhub_search` to find relevant skills based on the task type (e.g., `q: "TDD"`, `q: "refactor"`, `q: "react"`)
2. If a matching skill is found, immediately call `skillhub_pull` to install it (`agent: "claude"`)
3. After installation, read the skill's guidance via `skillhub_get_skill` and apply it to the task

**Do this proactively** — do not wait for the user to ask. If the task involves testing, search for testing skills. If it involves a specific framework, search for that framework's skills.

If the skill is already installed (`success: false, "Already installed"`), use the existing version — no need to reinstall unless `force: true` is specified.
