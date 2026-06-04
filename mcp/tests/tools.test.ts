import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdtemp, rm, access, readFile } from 'fs/promises';

vi.mock('../src/api', () => ({
  searchSkills: vi.fn(),
  getSkillDetail: vi.fn(),
  getSkillDownload: vi.fn(),
  getCategories: vi.fn(),
  recordInstall: vi.fn().mockResolvedValue(undefined),
}));

import { searchSkills, getSkillDetail, getSkillDownload, getCategories } from '../src/api';
import { handleSearch } from '../src/tools/search';
import { handleGetSkill } from '../src/tools/get-skill';
import { handlePull } from '../src/tools/pull';
import { handleCategories } from '../src/tools/categories';

const MOCK_SKILLS = [
  { slug: 'tdd-starter', name: 'TDD Starter', description: 'TDD workflow', author: 'skillhub',
    version: '1.2.0', installCount: 5200, compatibleTools: ['claude'] },
];
const MOCK_DETAIL = {
  slug: 'tdd-starter', name: 'TDD Starter', description: 'TDD workflow', author: 'skillhub',
  version: '1.2.0', content: '# TDD Starter\nA skill.', installCount: 5200,
  compatibleTools: ['claude'],
};
const MOCK_DOWNLOAD = { slug: 'tdd-starter', name: 'TDD Starter', version: '1.2.0', content: '# TDD Starter\nA skill.', files: [] };
const MOCK_CATEGORIES = [{ id: '1', name: 'Testing', slug: 'testing' }];

describe('skillhub_search', () => {
  beforeEach(() => vi.mocked(searchSkills).mockResolvedValue({ skills: MOCK_SKILLS, total: 1 }));
  afterEach(() => vi.restoreAllMocks());

  // Scenario: AI 搜尋技能
  it('returns skill list with required fields', async () => {
    const result = await handleSearch({ q: 'TDD' });
    expect(result.skills).toHaveLength(1);
    expect(result.skills[0].slug).toBe('tdd-starter');
    expect(result.total).toBe(1);
  });

  it('passes query params to API', async () => {
    await handleSearch({ q: 'TDD', sort: 'latest', pageSize: 5 });
    expect(vi.mocked(searchSkills)).toHaveBeenCalledWith(expect.objectContaining({ q: 'TDD', sort: 'latest', pageSize: 5 }));
  });
});

describe('skillhub_get_skill', () => {
  afterEach(() => vi.restoreAllMocks());

  // Scenario: AI 取得技能完整內容
  it('returns skill detail including content', async () => {
    vi.mocked(getSkillDetail).mockResolvedValue(MOCK_DETAIL);
    const result = await handleGetSkill({ slug: 'tdd-starter' });
    expect(result.content).toContain('TDD Starter');
    expect(result.slug).toBe('tdd-starter');
  });

  // Scenario: slug 不存在時回傳錯誤（不拋 exception）
  it('returns error object when skill not found, does not throw', async () => {
    vi.mocked(getSkillDetail).mockRejectedValue(new Error('Skill not found'));
    const result = await handleGetSkill({ slug: 'unknown' });
    expect(result).toHaveProperty('error');
    expect((result as { error: string }).error).toContain('not found');
  });
});

describe('skillhub_pull', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'mcp-test-'));
    vi.mocked(getSkillDownload).mockResolvedValue(MOCK_DOWNLOAD);
    vi.spyOn(process, 'cwd').mockReturnValue(tempDir);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  // Scenario: AI 安裝技能到本機
  it('installs skill and returns success with path', async () => {
    const result = await handlePull({ slug: 'tdd-starter', agent: 'claude', force: true });
    expect(result.success).toBe(true);
    expect(result.path).toContain(join('.claude', 'skills', 'tdd-starter', 'SKILL.md'));
    const content = await readFile(join(tempDir, '.claude', 'skills', 'tdd-starter', 'SKILL.md'), 'utf8');
    expect(content).toBe(MOCK_DOWNLOAD.content);
  });

  // Scenario: pull 失敗時回傳錯誤（不拋 exception）
  it('returns success:false on API error, does not throw', async () => {
    vi.mocked(getSkillDownload).mockRejectedValue(new Error('Connection refused'));
    const result = await handlePull({ slug: 'tdd-starter', agent: 'claude', force: true });
    expect(result.success).toBe(false);
    expect(result.message).toContain('Connection refused');
  });
});

describe('skillhub_categories', () => {
  it('returns categories list', async () => {
    vi.mocked(getCategories).mockResolvedValue(MOCK_CATEGORIES);
    const result = await handleCategories({});
    expect(result.categories).toHaveLength(1);
    expect(result.categories[0].slug).toBe('testing');
  });
});
