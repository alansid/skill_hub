import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { SkillCardComponent } from './skill-card.component';
import { SkillSummary } from '../../models/skill.model';

const MOCK_SKILL: SkillSummary = {
  id: '1',
  slug: 'tdd-starter',
  name: 'TDD Starter',
  description: 'A comprehensive TDD workflow for any language.',
  category: { id: 'c1', name: 'Testing', slug: 'testing' },
  tags: [{ id: 't1', name: 'TDD', type: 'PROBLEM_SPACE' }],
  author: 'skillhub',
  version: '1.2.0',
  installCount: 5200,
  compatibleTools: ['claude', 'copilot'],
  createdAt: '2026-01-01T00:00:00',
};

describe('SkillCardComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SkillCardComponent],
      providers: [provideRouter([]), provideAnimationsAsync()],
    }).compileComponents();
  });

  it('renders skill name', () => {
    const fixture = TestBed.createComponent(SkillCardComponent);
    fixture.componentRef.setInput('skill', MOCK_SKILL);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('TDD Starter');
  });

  it('renders author and version', () => {
    const fixture = TestBed.createComponent(SkillCardComponent);
    fixture.componentRef.setInput('skill', MOCK_SKILL);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('skillhub');
    expect(fixture.nativeElement.textContent).toContain('1.2.0');
  });

  it('renders install count', () => {
    const fixture = TestBed.createComponent(SkillCardComponent);
    fixture.componentRef.setInput('skill', MOCK_SKILL);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('5,200');
  });

  it('renders compatible tools', () => {
    const fixture = TestBed.createComponent(SkillCardComponent);
    fixture.componentRef.setInput('skill', MOCK_SKILL);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('claude');
    expect(fixture.nativeElement.textContent).toContain('copilot');
  });
});
