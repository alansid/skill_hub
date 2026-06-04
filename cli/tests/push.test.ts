import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises';

vi.mock('../src/api', async (importOriginal) => {
  const original = await importOriginal<typeof import('../src/api')>();
  return { ...original, publishSkill: vi.fn() };
});

import { publishSkill } from '../src/api';
import { pushSkill } from '../src/commands/push';

const SKILL_MD = `---
name: My Push Skill
slug: my-push-skill
version: 1.2.0
description: A skill for testing push
category: testing
compatibleTools:
  - claude
---
# My Push Skill
This is the content.
`;

describe('pushSkill', () => {
  let tempDir: string;
  let skillPath: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'push-test-'));
    skillPath = join(tempDir, 'SKILL.md');
    await writeFile(skillPath, SKILL_MD, 'utf8');
    vi.mocked(publishSkill).mockResolvedValue({ slug: 'my-push-skill', name: 'My Push Skill', version: '1.2.0', author: 'testuser' });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  // Scenario: CLI 成功上傳
  it('publishes skill and prints success', async () => {
    const spy = vi.spyOn(console, 'log');
    await pushSkill(skillPath, { token: 'test-token' });
    expect(vi.mocked(publishSkill)).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'my-push-skill', name: 'My Push Skill' }),
      'test-token'
    );
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('my-push-skill'));
  });

  // Scenario: 接受目錄路徑（自動找 SKILL.md）
  it('accepts directory path and finds SKILL.md', async () => {
    await pushSkill(tempDir, { token: 'test-token' });
    expect(vi.mocked(publishSkill)).toHaveBeenCalled();
  });

  // Scenario: CLI 無 Token → 錯誤退出
  it('throws when no token is provided', async () => {
    delete process.env['SKILLHUB_TOKEN'];
    await expect(pushSkill(skillPath, {})).rejects.toThrow(/No auth token/i);
  });

  // Scenario: Slug 衝突 → 顯示提示
  it('prints conflict message on 409', async () => {
    vi.mocked(publishSkill).mockRejectedValue({ status: 409 });
    const spy = vi.spyOn(console, 'error');
    await expect(pushSkill(skillPath, { token: 'test-token' })).rejects.toThrow();
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('already exists'));
  });
});
