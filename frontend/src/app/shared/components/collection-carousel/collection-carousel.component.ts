import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { CollectionWithSkills } from '../../models/skill.model';

@Component({
  selector: 'app-collection-carousel',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  styles: [`
    .col-row {
      display: flex;
      flex-direction: row;
      gap: 16px;
      overflow-x: auto;
      padding-bottom: 8px;
      scrollbar-width: none;
    }
    .col-row::-webkit-scrollbar { display: none; }
    .col-card {
      background: var(--brand-surface) !important;
      color: var(--brand-text) !important;
      width: 340px !important;
      min-width: 340px !important;
      max-width: 340px !important;
      height: 130px !important;
      flex-shrink: 0 !important;
      transition: transform .15s ease, box-shadow .15s ease;
      overflow: hidden;
      position: relative;
      padding: 0 !important;
    }
    .col-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 24px rgba(99,102,241,.18) !important;
      border-color: var(--brand-primary) !important;
    }
    .col-card mat-card-title {
      color: var(--brand-text) !important;
      font-size: 15px;
      font-weight: 700;
    }
    .col-card mat-card-subtitle {
      color: var(--brand-muted) !important;
      font-size: 12px;
    }
    .accent-bar {
      height: 4px;
      border-radius: 4px 4px 0 0;
    }
    .count-badge {
      display: inline-flex; align-items: center; gap: 4px;
      background: #eef2ff;
      color: var(--brand-primary);
      border-radius: 20px;
      padding: 2px 10px; font-size: 11px; font-weight: 600;
    }
    .skill-pill {
      background: #f5f5ff;
      color: var(--brand-muted);
      border: 1px solid var(--brand-border);
      border-radius: 6px;
      padding: 2px 8px;
      font-size: 11px;
      font-weight: 400;
    }
  `],
  template: `
    <div class="col-row">
      @for (col of collections; track col.id; let i = $index) {
        <mat-card class="col-card cursor-pointer !p-0">
          <div class="accent-bar" [style.background]="accentColors[i % accentColors.length]"></div>
          <div style="padding:14px 16px 12px;display:flex;flex-direction:column;height:126px;box-sizing:border-box;overflow:hidden;">
            <p style="font-size:15px;font-weight:700;color:var(--brand-text);margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{{ col.name }}</p>
            <p style="font-size:12px;color:var(--brand-muted);margin:4px 0 0;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">{{ col.description }}</p>
            <div style="display:flex;align-items:center;gap:6px;margin-top:auto;flex-wrap:nowrap;overflow:hidden;">
              <span class="count-badge">⚡ {{ col.skills.length }} 個技能</span>
              @for (skill of col.skills.slice(0, 2); track skill.id) {
                <span class="skill-pill" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100px;cursor:pointer;"
                      (click)="goToSkill(skill.slug, $event)">{{ skill.name }}</span>
              }
            </div>
          </div>
        </mat-card>
      }
    </div>
  `,
})
export class CollectionCarouselComponent {
  @Input() collections: CollectionWithSkills[] = [];
  readonly accentColors = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'];

  private router = inject(Router);

  goToSkill(slug: string, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/skills', slug]);
  }
}
