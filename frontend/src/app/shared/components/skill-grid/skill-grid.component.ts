import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SkillCardComponent } from '../skill-card/skill-card.component';
import { SkillSummary } from '../../models/skill.model';

@Component({
  selector: 'app-skill-grid',
  standalone: true,
  imports: [CommonModule, SkillCardComponent, MatProgressSpinnerModule],
  styles: [`.skill-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
    @media (max-width: 1280px) { .skill-grid { grid-template-columns: repeat(3, 1fr); } }
    @media (max-width: 900px)  { .skill-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 600px)  { .skill-grid { grid-template-columns: 1fr; } }
  `],
  template: `
    @if (loading) {
      <div class="flex justify-center py-20">
        <mat-spinner diameter="48" />
      </div>
    } @else if (skills.length === 0) {
      <div class="flex flex-col items-center py-20 rounded-2xl border-2 border-dashed border-[var(--brand-border)] bg-white/60">
        <span class="text-6xl mb-4 opacity-70">🔍</span>
        <p class="text-base font-semibold text-[var(--brand-text)]">找不到符合的技能</p>
        <p class="text-sm mt-1 text-[var(--brand-muted)]">請嘗試其他關鍵字或調整篩選條件</p>
      </div>
    } @else {
      <div class="skill-grid">
        @for (skill of skills; track skill.id) {
          <app-skill-card [skill]="skill" />
        }
      </div>
    }
  `,
})
export class SkillGridComponent {
  @Input() skills: SkillSummary[] = [];
  @Input() loading = false;
}
