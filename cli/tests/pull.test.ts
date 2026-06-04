import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdtemp, rm, access, readFile } from 'fs/promises';
import { mkdirSync, writeFileSync } from 'fs';

vi.mock('../src/api', () => ({
  fetchSkillDownload: vi.fn(),
  recordInstall: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../src/lockfile', () => ({
  addLockEntry: vi.fn().mockResolvedValue(undefined),
  readLock: vi.fn().mockReturnValue({ skills: {} }),
  writeLock: vi.fn().mockResolvedValue(undefined),
  getLockEntry: vi.fn().mockReturnValue(undefined),
  getAllLockEntries: vi.fn().mockReturnValue({}),
  removeLockEntry: vi.fn().mockResolvedValue(undefined),
}));

import { fetchSkillDownload } from '../src/api';
import { pullSkill, pullSkillMulti, resolveInstallPath } from '../src/commands/pull';

const MOCK_RESPONSE = {
  slug: 'code-review',
  name: 'Code Review',
  version: '1.0.0',
  content: '# Code Review\nA skill for reviewing code.',
  files: [],
};

describe('pullSkill', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'skillhub-test-'));
    vi.mocked(fetchSkillDownload).mockResolvedValue(MOCK_RESPONSE);
    vi.spyOn(process, 'cwd').mockReturnValue(tempDir);
    process.env['SKILLHUB_CONFIG_PATH'] = join(tempDir, '.skillhubrc.json');
    process.env['SKILLHUB_LOCK_PATH'] = join(tempDir, '.skillhub-lock.json');
  });

  afterEach(async () => {
    delete process.env['SKILLHUB_CONFIG_PATH'];
    delete process.env['SKILLHUB_LOCK_PATH'];
    await rm(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  // Scenario: 成功下載並安裝技能
  it('installs SKILL.md to .claude/skills/<slug>/SKILL.md', async () => {
    await pullSkill('code-review', { agent: 'claude', global: false, dryRun: false, force: false });
    const content = await readFile(join(tempDir, '.claude', 'skills', 'code-review', 'SKILL.md'), 'utf8');
    expect(content).toBe(MOCK_RESPONSE.content);
  });

  // Scenario: 技能不存在 → 拋出錯誤，不建立檔案
  it('throws when skill not found and creates no files', async () => {
    vi.mocked(fetchSkillDownload).mockRejectedValue(new Error("Skill 'unknown-skill' not found"));
    await expect(
      pullSkill('unknown-skill', { agent: 'claude', global: false, dryRun: false, force: false })
    ).rejects.toThrow('not found');
    await expect(access(join(tempDir, '.claude', 'skills', 'unknown-skill', 'SKILL.md'))).rejects.toThrow();
  });

  // Scenario: Dry-run 不寫入
  it('dry-run logs install path without writing any file', async () => {
    const spy = vi.spyOn(console, 'log');
    await pullSkill('code-review', { agent: 'claude', global: false, dryRun: true, force: false });
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('Dry run'));
    await expect(access(join(tempDir, '.claude', 'skills', 'code-review', 'SKILL.md'))).rejects.toThrow();
  });

  // Scenario: 技能已存在 — 使用者取消
  it('does not overwrite existing skill when user declines', async () => {
    const installPath = join(tempDir, '.claude', 'skills', 'code-review', 'SKILL.md');
    mkdirSync(join(tempDir, '.claude', 'skills', 'code-review'), { recursive: true });
    writeFileSync(installPath, 'original content', 'utf8');
    await pullSkill('code-review', { agent: 'claude', global: false, dryRun: false, force: false, confirm: async () => false });
    expect(await readFile(installPath, 'utf8')).toBe('original content');
  });

  // Scenario: --force 強制覆蓋
  it('overwrites existing skill when --force is set', async () => {
    const installPath = join(tempDir, '.claude', 'skills', 'code-review', 'SKILL.md');
    mkdirSync(join(tempDir, '.claude', 'skills', 'code-review'), { recursive: true });
    writeFileSync(installPath, 'old content', 'utf8');
    await pullSkill('code-review', { agent: 'claude', global: false, dryRun: false, force: true });
    expect(await readFile(installPath, 'utf8')).toBe(MOCK_RESPONSE.content);
  });

  // Scenario: --global 路徑指向 homedir
  it('resolveInstallPath uses homedir when global=true', () => {
    const path = resolveInstallPath('code-review', 'claude', true);
    expect(path).toMatch(/\.claude[/\\]skills[/\\]code-review[/\\]SKILL\.md$/);
    expect(path).not.toContain(tempDir);
  });
});

describe('pullSkillMulti', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'skillhub-multi-'));
    vi.mocked(fetchSkillDownload).mockResolvedValue(MOCK_RESPONSE);
    vi.spyOn(process, 'cwd').mockReturnValue(tempDir);
    process.env['SKILLHUB_CONFIG_PATH'] = join(tempDir, '.skillhubrc.json');
    process.env['SKILLHUB_LOCK_PATH'] = join(tempDir, '.skillhub-lock.json');
  });

  afterEach(async () => {
    delete process.env['SKILLHUB_CONFIG_PATH'];
    delete process.env['SKILLHUB_LOCK_PATH'];
    await rm(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  // Scenario: 多 agent 同時安裝
  it('installs to multiple agents when comma-separated', async () => {
    await pullSkillMulti('code-review', { agents: ['claude', 'opencode'], global: false, dryRun: false, force: false });
    const claudePath = join(tempDir, '.claude', 'skills', 'code-review', 'SKILL.md');
    const opencodePath = join(tempDir, '.opencode', 'skills', 'code-review', 'SKILL.md');
    expect(await readFile(claudePath, 'utf8')).toBe(MOCK_RESPONSE.content);
    expect(await readFile(opencodePath, 'utf8')).toBe(MOCK_RESPONSE.content);
  });

  // Scenario: 多 agent 部分失敗不中止
  it('continues other agents when one fails', async () => {
    vi.mocked(fetchSkillDownload)
      .mockResolvedValueOnce(MOCK_RESPONSE)   // claude succeeds
      .mockRejectedValueOnce(new Error('API error'));  // opencode fails

    const results = await pullSkillMulti('code-review', {
      agents: ['claude', 'opencode'], global: false, dryRun: false, force: false,
    });

    const claudePath = join(tempDir, '.claude', 'skills', 'code-review', 'SKILL.md');
    expect(await readFile(claudePath, 'utf8')).toBe(MOCK_RESPONSE.content);
    expect(results.failed).toHaveLength(1);
    expect(results.failed[0].agent).toBe('opencode');
  });

  // Scenario: pull 使用 config defaultAgent
  it('uses defaultAgent from config when no agent specified', async () => {
    writeFileSync(join(tempDir, '.skillhubrc.json'), JSON.stringify({ defaultAgent: 'opencode' }), 'utf8');
    await pullSkillMulti('code-review', { agents: [], global: false, dryRun: false, force: false });
    const opencodePath = join(tempDir, '.opencode', 'skills', 'code-review', 'SKILL.md');
    expect(await readFile(opencodePath, 'utf8')).toBe(MOCK_RESPONSE.content);
  });
});
