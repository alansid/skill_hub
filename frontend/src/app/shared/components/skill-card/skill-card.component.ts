import { Component, Input, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { SkillSummary } from '../../models/skill.model';
import { AuthService } from '../../../core/services/auth.service';
import { FavoriteService } from '../../../core/services/favorite.service';

@Component({
  selector: 'app-skill-card',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule],
  styles: [`
    :host { display: block; height: 100%; }
    .skill-card {
      transition: transform .15s ease, box-shadow .15s ease;
      display: flex !important;
      flex-direction: column !important;
      padding: 0 !important;
      overflow: hidden;
      cursor: pointer;
      height: 100%;
    }
    .skill-card:hover { transform: translateY(-2px); }
    .grad-bar {
      height: 3px;
      background: linear-gradient(to right, var(--brand-primary), var(--brand-accent));
      flex-shrink: 0;
    }
    .card-body {
      display: flex;
      flex-direction: column;
      flex: 1;
      padding: 14px 16px 12px;
      gap: 0;
    }
    .card-name {
      font-size: 14px;
      font-weight: 700;
      color: var(--brand-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1.3;
    }
    .card-meta {
      font-size: 11px;
      color: var(--brand-muted);
      margin-top: 3px;
    }
    .card-meta span { color: var(--brand-primary); font-weight: 500; }
    .card-desc {
      font-size: 12px;
      color: #6b7280;
      line-height: 1.55;
      margin-top: 8px;
      flex: 1;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .card-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      margin-top: 10px;
    }
    .tag-chip {
      background: #eef2ff;
      color: #4f46e5;
      border-radius: 5px;
      padding: 2px 8px;
      font-size: 11px;
      font-weight: 500;
    }
    .status-badge {
      display: inline-block;
      border-radius: 5px;
      padding: 2px 8px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .status-pending { background: #fef9c3; color: #a16207; }
    .status-suspended { background: #ffedd5; color: #c2410c; }
    .card-footer {
      border-top: 1px solid var(--brand-border);
      padding: 8px 16px 10px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }
    .dl-badge {
      display: flex; align-items: center; gap: 3px;
      font-size: 12px; font-weight: 500;
      color: #14b8a6;
    }
    .tool-badge {
      background: #eef2ff;
      color: #4f46e5;
      border-radius: 5px;
      padding: 2px 8px;
      font-size: 11px;
      font-weight: 500;
    }
    .fav-btn {
      display: inline-flex; align-items: center; justify-content: center;
      width: 28px; height: 28px; border-radius: 50%;
      border: none; background: transparent; cursor: pointer;
      transition: background .15s;
      padding: 0;
    }
    .fav-btn:hover { background: #fce7f3; }
    .fav-btn mat-icon { font-size: 18px; width: 18px; height: 18px; line-height: 18px; }
  `],
  template: `
    <mat-card class="skill-card" (click)="navigate()">
      <div class="grad-bar"></div>
      <div class="card-body">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;">
          <p class="card-name" style="margin:0;flex:1;min-width:0;">{{ skill.name }}</p>
          @if (skill.status === 'PENDING') {
            <span class="status-badge status-pending">Pending</span>
          }
          @if (skill.status === 'SUSPENDED') {
            <span class="status-badge status-suspended">Suspended</span>
          }
        </div>
        <p class="card-meta">by <span>{{ skill.author }}</span>&nbsp;·&nbsp;v{{ skill.version }}</p>
        <p class="card-desc">{{ skill.description }}</p>
        <div class="card-tags">
          @for (tag of skill.tags.slice(0, 3); track tag.id) {
            <span class="tag-chip">{{ tag.name }}</span>
          }
        </div>
      </div>
      <div class="card-footer">
        <div style="display:flex;align-items:center;gap:8px;">
          <span class="dl-badge">↓ {{ skill.installCount | number }}</span>
          @if (skill.ratingCount > 0) {
            <span style="display:flex;align-items:center;gap:2px;font-size:11px;color:#f59e0b;font-weight:600;">
              ★ {{ skill.avgRating | number:'1.1-1' }}
              <span style="color:#9ca3af;font-weight:400;">({{ skill.ratingCount }})</span>
            </span>
          }
        </div>
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;justify-content:flex-end">
          <button class="fav-btn" (click)="toggleFavorite($event)"
                  [attr.aria-label]="favorited() ? '取消收藏' : '加入收藏'">
            <mat-icon [style.color]="favorited() ? '#ec4899' : '#d1d5db'">
              {{ favorited() ? 'favorite' : 'favorite_border' }}
            </mat-icon>
          </button>
          @for (tool of skill.compatibleTools.slice(0,2); track tool) {
            <span class="tool-badge">{{ tool }}</span>
          }
        </div>
      </div>
    </mat-card>
  `,
})
export class SkillCardComponent {
  @Input({ required: true }) skill!: SkillSummary;

  private router   = inject(Router);
  private auth     = inject(AuthService);
  private favSvc   = inject(FavoriteService);

  favorited = computed(() => this.favSvc.isFavorited(this.skill.id));

  navigate(): void {
    this.router.navigate(['/skills', this.skill.slug]);
  }

  toggleFavorite(event: Event): void {
    event.stopPropagation();
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/auth/login']);
      return;
    }
    const req = this.favorited()
      ? this.favSvc.removeFavorite(this.skill.id)
      : this.favSvc.addFavorite(this.skill.id);
    req.subscribe({ error: () => {} });
  }
}
