import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { PublishSkillComponent } from './publish-skill.component';
import { SkillService } from '../../core/services/skill.service';

function setup() {
  const mockService = {
    getCategories: () => of({ categories: [{ id: '1', name: 'Testing', slug: 'testing' }] }),
    getTags: () => of({ tags: [] }),
    publishSkill: vi.fn().mockReturnValue(of({ slug: 'my-skill', name: 'My Skill', version: '1.0.0', author: 'test' })),
  };
  TestBed.configureTestingModule({
    imports: [PublishSkillComponent],
    providers: [
      provideRouter([{ path: 'skills/:slug', component: PublishSkillComponent }]),
      provideAnimationsAsync(),
      { provide: SkillService, useValue: mockService },
    ],
  });
  const fixture = TestBed.createComponent(PublishSkillComponent);
  fixture.detectChanges();
  return fixture;
}

describe('PublishSkillComponent', () => {
  it('renders publish form', () => {
    const fixture = setup();
    expect(fixture.nativeElement.textContent).toContain('Publish');
  });

  // Scenario: slug 自動從 name 推導
  it('auto-derives slug from name input', async () => {
    const fixture = setup();
    const nameInput = fixture.debugElement.query(By.css('input[formControlName="name"]'));
    nameInput.nativeElement.value = 'My New Skill';
    nameInput.nativeElement.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    const slugInput = fixture.debugElement.query(By.css('input[formControlName="slug"]'));
    expect(slugInput?.nativeElement.value).toBe('my-new-skill');
  });

  it('shows available tools as options', () => {
    const fixture = setup();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Compatible Tools');
  });

  // Scenario: 前端表單驗證 — 無效 slug
  it('shows slug validation error for invalid format', async () => {
    const fixture = setup();
    const slugCtrl = fixture.componentInstance.form.get('slug')!;
    slugCtrl.setValue('Invalid Slug!!!');
    slugCtrl.markAsTouched();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(slugCtrl.invalid).toBe(true);
    expect(slugCtrl.hasError('pattern')).toBe(true);
  });
});
