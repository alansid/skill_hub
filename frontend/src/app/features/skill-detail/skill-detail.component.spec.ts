import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';

import { SkillDetailComponent } from './skill-detail.component';
import { SkillService } from '../../core/services/skill.service';
import { SkillDetail, SkillSummary } from '../../shared/models/skill.model';

const MOCK_DETAIL: SkillDetail = {
  id: '1',
  slug: 'tdd-skill',
  name: 'TDD Workflow',
  description: 'A comprehensive TDD workflow.',
  category: { id: 'c1', name: 'Testing', slug: 'testing' },
  tags: [{ id: 't1', name: 'TDD', type: 'PROBLEM_SPACE' }],
  author: 'skillhub',
  version: '1.0.0',
  installCount: 100,
  compatibleTools: ['claude'],
  createdAt: '2026-01-01T00:00:00',
  installs24h: 50,
  content: '# TDD\nThis is the SKILL.md content.',
  updatedAt: '2026-06-01T00:00:00',
};

const MOCK_RELATED: SkillSummary = {
  id: '2',
  slug: 'related-skill',
  name: 'Related Skill',
  description: 'A related skill.',
  category: { id: 'c1', name: 'Testing', slug: 'testing' },
  tags: [],
  author: 'test',
  version: '1.0.0',
  installCount: 50,
  compatibleTools: ['claude'],
  createdAt: '2026-01-01T00:00:00',
};

function setup(slug: string, skillResponse: Parameters<typeof of>[0] | 'error') {
  const mockService = {
    getSkillDetail: () =>
      skillResponse === 'error'
        ? throwError(() => new Error('Not found'))
        : of(skillResponse as SkillDetail),
    getRelatedSkills: () => of({ skills: [MOCK_RELATED] }),
  };

  TestBed.configureTestingModule({
    imports: [SkillDetailComponent],
    providers: [
      provideRouter([]),
      provideAnimationsAsync(),
      {
        provide: ActivatedRoute,
        useValue: { paramMap: of(convertToParamMap({ slug })) },
      },
      { provide: SkillService, useValue: mockService },
    ],
  });

  const fixture = TestBed.createComponent(SkillDetailComponent);
  fixture.detectChanges();
  return fixture;
}

describe('SkillDetailComponent', () => {
  // Scenario: 詳情頁載入 → 顯示技能名稱、描述、content、安裝數、相容工具
  it('renders skill name, author, description and install count', () => {
    const fixture = setup('tdd-skill', MOCK_DETAIL);
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('TDD Workflow');
    expect(text).toContain('skillhub');
    expect(text).toContain('A comprehensive TDD workflow.');
    expect(text).toContain('100');
  });

  it('renders SKILL.md content block', () => {
    const fixture = setup('tdd-skill', MOCK_DETAIL);
    const pre = fixture.debugElement.query(By.css('pre.content-block'));
    expect(pre).not.toBeNull();
    expect(pre.nativeElement.textContent).toContain('SKILL.md content');
  });

  it('renders compatible tool', () => {
    const fixture = setup('tdd-skill', MOCK_DETAIL);
    expect(fixture.nativeElement.textContent).toContain('claude');
  });

  // Scenario: 詳情頁有相關技能 → 顯示最多 4 個同分類技能卡片
  it('renders related skill cards', () => {
    const fixture = setup('tdd-skill', MOCK_DETAIL);
    const cards = fixture.debugElement.queryAll(By.css('app-skill-card'));
    expect(cards.length).toBeGreaterThan(0);
    expect(cards.length).toBeLessThanOrEqual(4);
  });

  // Scenario: slug 不存在 → 顯示 404 空狀態
  it('shows 404 state when skill is not found', () => {
    const fixture = setup('nonexistent', 'error');
    expect(fixture.nativeElement.textContent).toContain('找不到這個技能');
  });

  // Phase 6 Scenario: 詳情頁顯示 pull 指令
  it('shows npx pull command in install section', () => {
    const fixture = setup('tdd-skill', MOCK_DETAIL);
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('npx @skill-hub/cli pull tdd-skill');
  });
});
