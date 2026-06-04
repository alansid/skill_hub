import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { SkillGridComponent } from './skill-grid.component';
import { SkillSummary } from '../../models/skill.model';

const makeSkill = (i: number): SkillSummary => ({
  id: `${i}`, slug: `skill-${i}`, name: `Skill ${i}`, description: `Desc ${i}`,
  category: { id: 'c1', name: 'Frontend', slug: 'frontend' },
  tags: [], author: 'test', version: '1.0.0',
  installCount: i * 10, compatibleTools: ['claude'],
  createdAt: '2026-01-01T00:00:00',
});

describe('SkillGridComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SkillGridComponent],
      providers: [provideAnimationsAsync()],
    }).compileComponents();
  });

  it('renders a card for each skill', () => {
    const fixture = TestBed.createComponent(SkillGridComponent);
    fixture.componentRef.setInput('skills', [makeSkill(1), makeSkill(2), makeSkill(3)]);
    fixture.componentRef.setInput('loading', false);
    fixture.detectChanges();
    const cards = fixture.debugElement.queryAll(By.css('app-skill-card'));
    expect(cards.length).toBe(3);
  });

  it('shows spinner when loading', () => {
    const fixture = TestBed.createComponent(SkillGridComponent);
    fixture.componentRef.setInput('skills', []);
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();
    const spinner = fixture.debugElement.query(By.css('mat-spinner'));
    expect(spinner).not.toBeNull();
  });

  it('shows empty state when no skills and not loading', () => {
    const fixture = TestBed.createComponent(SkillGridComponent);
    fixture.componentRef.setInput('skills', []);
    fixture.componentRef.setInput('loading', false);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('找不到符合的技能');
  });
});
