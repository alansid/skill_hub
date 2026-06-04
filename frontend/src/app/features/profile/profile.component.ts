import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AuthService } from '../../core/services/auth.service';
import { FavoriteService } from '../../core/services/favorite.service';
import { SkillGridComponent } from '../../shared/components/skill-grid/skill-grid.component';
import { SkillSummary } from '../../shared/models/skill.model';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatToolbarModule, SkillGridComponent],
  styles: [`
    :host { display: block; background: var(--brand-bg); min-height: 100vh; }

    .hero {
      background: linear-gradient(135deg, #6366f1 0%, #818cf8 60%, #14b8a6 100%);
      padding: 36px 40px 40px;
    }
    .hero-inner {
      max-width: 1100px; margin: 0 auto;
      display: flex; align-items: center; gap: 20px;
    }
    .avatar-circle {
      width: 72px; height: 72px; border-radius: 50%;
      background: rgba(255,255,255,.2);
      border: 2px solid rgba(255,255,255,.4);
      display: flex; align-items: center; justify-content: center;
      font-size: 28px; font-weight: 800; color: #fff;
      flex-shrink: 0; overflow: hidden;
    }
    .avatar-circle img { width: 100%; height: 100%; object-fit: cover; }
    .hero-name { font-size: 24px; font-weight: 800; color: #fff; margin: 0 0 4px; }
    .hero-email { font-size: 13px; color: rgba(255,255,255,.75); margin: 0; }
    .hero-stats {
      display: flex; gap: 24px; margin-top: 10px;
    }
    .stat-item { text-align: center; }
    .stat-num { font-size: 20px; font-weight: 800; color: #fff; }
    .stat-label { font-size: 11px; color: rgba(255,255,255,.7); margin-top: 2px; }

    .logout-btn {
      margin-left: auto;
      color: rgba(255,255,255,.85) !important;
      border-color: rgba(255,255,255,.4) !important;
      border-radius: 10px !important;
    }
    .logout-btn:hover { color: #fff !important; border-color: rgba(255,255,255,.7) !important; }

    .body-wrap { max-width: 1100px; margin: 0 auto; padding: 32px 24px; }

    .section-header {
      display: flex; align-items: center; gap: 10px;
      font-size: 16px; font-weight: 700; color: var(--brand-text);
      margin-bottom: 8px;
    }
    .section-icon {
      width: 32px; height: 32px; border-radius: 8px;
      background: #fce7f3; display: flex; align-items: center; justify-content: center;
    }
    .divider { height: 1px; background: var(--brand-border); margin-bottom: 20px; }

    .empty-state {
      text-align: center; padding: 60px 20px;
      color: var(--brand-muted);
    }
    .empty-icon { font-size: 48px; margin-bottom: 12px; }
    .empty-title { font-size: 15px; font-weight: 600; color: var(--brand-text); margin-bottom: 6px; }
    .empty-sub { font-size: 13px; }
  `],
  template: `
    <!-- Toolbar -->
    <mat-toolbar style="background:linear-gradient(135deg,#6366f1 0%,#818cf8 100%);height:64px;min-height:64px;position:sticky;top:0;z-index:100;">
      <div style="display:flex;align-items:center;gap:8px;cursor:pointer;" (click)="goHome()">
        <span style="font-size:24px;line-height:1;">⚡</span>
        <span style="font-size:18px;font-weight:800;color:#fff;">SkillHub</span>
      </div>
      <span style="display:inline-flex;align-items:center;font-size:11px;font-weight:500;background:rgba(255,255,255,0.2);color:#fff;border-radius:20px;padding:2px 10px;margin-left:8px;">個人頁面</span>
      <span style="flex:1;"></span>
      <button mat-stroked-button class="logout-btn" (click)="logout()">
        <mat-icon>logout</mat-icon>
        登出
      </button>
    </mat-toolbar>

    <!-- Hero -->
    <div class="hero">
      <div class="hero-inner">
        <div class="avatar-circle">
          @if (user()?.avatarUrl) {
            <img [src]="user()!.avatarUrl" alt="avatar" />
          } @else {
            {{ user()?.displayName?.charAt(0)?.toUpperCase() || '?' }}
          }
        </div>
        <div style="flex:1;min-width:0;">
          <h1 class="hero-name">{{ user()?.displayName || '使用者' }}</h1>
          <p class="hero-email">{{ user()?.email }}</p>
          <div class="hero-stats">
            <div class="stat-item">
              <div class="stat-num">{{ favorites().length }}</div>
              <div class="stat-label">已收藏技能</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Body -->
    <div class="body-wrap">
      <div class="section-header">
        <div class="section-icon">
          <mat-icon style="color:#ec4899;font-size:18px;width:18px;height:18px;line-height:1;">favorite</mat-icon>
        </div>
        我的收藏
      </div>
      <div class="divider"></div>

      @if (loading()) {
        <div style="display:flex;justify-content:center;padding:60px 0;">
          <mat-spinner diameter="48" />
        </div>
      } @else if (favorites().length === 0) {
        <div class="empty-state">
          <div class="empty-icon">🔖</div>
          <div class="empty-title">還沒有收藏的技能</div>
          <div class="empty-sub">在 Marketplace 點擊心形圖示來收藏你喜歡的技能</div>
          <button mat-flat-button
                  style="margin-top:16px;background:linear-gradient(135deg,#6366f1,#818cf8);color:#fff;border-radius:10px;font-weight:600;"
                  (click)="goHome()">
            前往 Marketplace
          </button>
        </div>
      } @else {
        <app-skill-grid [skills]="favorites()" [loading]="false" />
      }
    </div>
  `,
})
export class ProfileComponent implements OnInit {
  private authService     = inject(AuthService);
  private favoriteService = inject(FavoriteService);
  private router          = inject(Router);

  user      = this.authService.currentUser;
  favorites = signal<SkillSummary[]>([]);
  loading   = signal(true);

  ngOnInit(): void {
    this.favoriteService.getFavorites().subscribe({
      next: r => { this.favorites.set(r.skills); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  logout(): void {
    this.authService.logout();
  }

  goHome(): void {
    this.router.navigate(['/']);
  }
}
