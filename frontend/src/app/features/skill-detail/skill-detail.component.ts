import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';

import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { SkillService } from '../../core/services/skill.service';
import { AuthService } from '../../core/services/auth.service';
import { FavoriteService } from '../../core/services/favorite.service';
import { SkillCardComponent } from '../../shared/components/skill-card/skill-card.component';
import { RatingService } from '../../core/services/rating.service';
import { SkillDetail, SkillSummary, SkillVersionDto, RatingDto } from '../../shared/models/skill.model';

@Component({
  selector: 'app-skill-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatChipsModule,
    MatIconModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatToolbarModule,
    MatDialogModule,
    MatExpansionModule,
    FormsModule,
    SkillCardComponent,
  ],
  styles: [`
    :host { display: block; }

    .hero {
      background: linear-gradient(135deg, #6366f1 0%, #818cf8 60%, #14b8a6 100%);
      color: #fff;
      padding: 32px 40px 48px;
    }
    .hero-back {
      display: inline-flex; align-items: center; gap: 6px;
      color: rgba(255,255,255,.8); font-size: 13px; font-weight: 500;
      cursor: pointer; border: none; background: transparent;
      padding: 0; margin-bottom: 20px;
      transition: color .15s;
    }
    .hero-back:hover { color: #fff; }

    .stat-chip {
      display: inline-flex; align-items: center; gap: 6px;
      background: rgba(255,255,255,.18); backdrop-filter: blur(4px);
      color: #fff; border-radius: 20px;
      padding: 4px 14px; font-size: 13px; font-weight: 600;
    }
    .tool-pill {
      display: inline-flex; align-items: center;
      background: rgba(255,255,255,.15);
      color: #fff; border-radius: 8px;
      padding: 3px 12px; font-size: 12px; font-weight: 600;
      text-transform: capitalize;
    }
    .version-badge {
      display: inline-block;
      background: rgba(255,255,255,.2); color: #fff;
      border-radius: 6px; padding: 2px 10px;
      font-size: 12px; font-weight: 700; font-family: monospace;
    }

    .content-block {
      background: #1e1b4b; color: #e0e7ff;
      border-radius: 12px; padding: 20px 24px;
      font-family: 'Cascadia Code', 'Fira Code', monospace;
      font-size: 13px; line-height: 1.7;
      white-space: pre-wrap; overflow-x: auto;
    }
    .section-title {
      font-size: 15px; font-weight: 700;
      color: var(--brand-text); margin-bottom: 12px;
      display: flex; align-items: center; gap: 8px;
    }
    .download-btn {
      background: #ffffff !important;
      color: #6366f1 !important; font-weight: 700 !important;
      border-radius: 10px !important; padding: 0 28px !important;
      height: 48px !important; font-size: 15px !important;
      box-shadow: 0 2px 12px rgba(0,0,0,.15) !important;
    }
    .download-btn:hover {
      background: #f5f5ff !important;
    }
  `],
  template: `
    <!-- Toolbar -->
    <mat-toolbar style="background:linear-gradient(135deg,#6366f1 0%,#818cf8 100%);height:64px;min-height:64px;position:sticky;top:0;z-index:100;">
      <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
        <span style="font-size:24px;">⚡</span>
        <span style="font-size:18px;font-weight:800;color:#fff;">SkillHub</span>
        <span style="display:inline-flex;align-items:center;font-size:11px;font-weight:500;background:rgba(255,255,255,0.2);color:#fff;border-radius:20px;padding:2px 10px;margin-left:4px;">Marketplace</span>
      </div>
      <span style="flex:1;"></span>
      @if (auth.isLoggedIn()) {
        <a routerLink="/profile"
           style="display:inline-flex;align-items:center;gap:6px;margin-right:12px;
                  color:rgba(255,255,255,0.85);text-decoration:none;font-size:13px;font-weight:600;">
          <mat-icon style="font-size:16px;width:16px;height:16px;color:#f9a8d4;">favorite</mat-icon>
          我的收藏
        </a>
      }
      <button mat-icon-button (click)="goBack()" aria-label="回到首頁"
              style="color:rgba(255,255,255,0.85);margin-right:8px;">
        <mat-icon>arrow_back</mat-icon>
      </button>
    </mat-toolbar>

    @if (loading()) {
      <div style="display:flex;justify-content:center;align-items:center;min-height:calc(100vh - 64px);">
        <mat-spinner diameter="52" />
      </div>
    } @else if (skill()) {
      <!-- SUSPENDED Banner -->
      @if (skill()!.status === 'SUSPENDED') {
        <div style="background:#fff7ed;border-bottom:2px solid #f97316;padding:12px 24px;display:flex;align-items:center;gap:10px;">
          <mat-icon style="color:#f97316;">warning</mat-icon>
          <span style="font-size:14px;color:#9a3412;font-weight:500;">此技能因被多次舉報而暫停，請謹慎使用。</span>
        </div>
      }
      @if (skill()!.status === 'PENDING') {
        <div style="background:#fefce8;border-bottom:2px solid #eab308;padding:12px 24px;display:flex;align-items:center;gap:10px;">
          <mat-icon style="color:#eab308;">schedule</mat-icon>
          <span style="font-size:14px;color:#713f12;font-weight:500;">此技能正在審核中，將於 24 小時內自動上架。</span>
        </div>
      }

      <!-- Hero -->
      <div class="hero">
        <div style="max-width:1100px;margin:0 auto;">
          <button class="hero-back" (click)="goBack()">
            ← 回到 Marketplace
          </button>

          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:24px;flex-wrap:wrap;">
            <div style="flex:1;min-width:0;">
              <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
                <h1 style="font-size:30px;font-weight:800;color:#fff;margin:0;letter-spacing:-0.5px;">{{ skill()!.name }}</h1>
                <span class="version-badge">v{{ skill()!.version }}</span>
              </div>
              <p style="font-size:14px;color:rgba(255,255,255,0.75);margin:0 0 14px;">
                by <span style="font-weight:600;color:#fff;">{{ skill()!.author }}</span>
                &nbsp;·&nbsp; {{ skill()!.category.name }}
              </p>
              <p style="font-size:15px;color:rgba(255,255,255,0.88);line-height:1.65;max-width:620px;margin:0 0 18px;">{{ skill()!.description }}</p>

              <!-- Stats row -->
              <div style="display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-bottom:14px;">
                <span class="stat-chip">↓ {{ skill()!.installCount | number }} 下載</span>
                <span class="stat-chip">📈 {{ skill()!.installs24h | number }} / 24h</span>
                @if (skill()!.ratingCount > 0) {
                  <span class="stat-chip">★ {{ skill()!.avgRating | number:'1.1-1' }} ({{ skill()!.ratingCount }} 評分)</span>
                }
              </div>

              <!-- Tags -->
              <div style="display:flex;flex-wrap:wrap;gap:8px;">
                @for (tag of skill()!.tags; track tag.id) {
                  <span class="tool-pill">{{ tag.name }}</span>
                }
              </div>
            </div>

            <!-- CTA -->
            <div style="display:flex;flex-direction:column;gap:10px;margin-top:8px;align-items:flex-end;">
              <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end;">
                @if (auth.isLoggedIn()) {
                  <button mat-stroked-button (click)="openReportDialog()"
                          style="color:rgba(255,255,255,0.7);border-color:rgba(255,255,255,0.3);height:44px;">
                    <mat-icon style="font-size:16px;width:16px;height:16px;">flag</mat-icon>
                    舉報
                  </button>
                }
                <button mat-stroked-button (click)="toggleFavorite()"
                        style="color:#fff;border-color:rgba(255,255,255,0.5);height:44px;">
                  <mat-icon [style.color]="favorited() ? '#f9a8d4' : 'rgba(255,255,255,0.8)'">
                    {{ favorited() ? 'favorite' : 'favorite_border' }}
                  </mat-icon>
                  {{ favorited() ? '已收藏' : '收藏' }}
                </button>
                <button mat-flat-button class="download-btn" (click)="downloadSkill()">
                  <mat-icon>download</mat-icon>
                  下載 Skill
                </button>
                @if (isAuthor()) {
                  <button mat-stroked-button (click)="goToEdit()"
                          style="color:#fff;border-color:rgba(255,255,255,0.5);height:44px;">
                    <mat-icon style="font-size:16px;width:16px;height:16px;">edit</mat-icon>
                    編輯
                  </button>
                  <button mat-stroked-button (click)="confirmDelete()"
                          style="color:#fca5a5;border-color:rgba(252,165,165,0.5);height:44px;">
                    <mat-icon style="font-size:16px;width:16px;height:16px;">delete</mat-icon>
                    刪除
                  </button>
                }
              </div>
              <div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:flex-end;">
                @for (tool of skill()!.compatibleTools; track tool) {
                  <span class="tool-pill">{{ tool }}</span>
                }
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Body -->
      <div style="max-width:1100px;margin:0 auto;padding:32px 24px;display:grid;grid-template-columns:1fr 340px;gap:32px;">
        <!-- Main: content -->
        <div style="display:flex;flex-direction:column;gap:24px;min-width:0;">
          @if (skill()!.content) {
            <section>
              <p class="section-title">
                <mat-icon class="text-[var(--brand-primary)]">description</mat-icon>
                SKILL.md
              </p>
              <pre class="content-block">{{ skill()!.content }}</pre>
            </section>
            <mat-divider />
          }

          <!-- Ratings Section -->
          <section>
            <p class="section-title">
              <mat-icon style="color:#f59e0b;">star</mat-icon>
              評分與評論
            </p>

            <!-- Submit Rating Form -->
            @if (auth.isLoggedIn()) {
              <div style="background:#f9fafb;border-radius:12px;padding:16px;margin-bottom:16px;border:1px solid var(--brand-border);">
                <p style="font-size:13px;font-weight:600;margin:0 0 10px;color:var(--brand-text);">
                  {{ myRating() ? '您的評分' : '為此技能評分' }}
                </p>
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px;">
                  @for (star of [1,2,3,4,5]; track star) {
                    <button style="background:none;border:none;cursor:pointer;font-size:24px;line-height:1;padding:0;"
                            (click)="setRatingStar(star)">
                      <span [style.color]="star <= ratingStars() ? '#f59e0b' : '#d1d5db'">★</span>
                    </button>
                  }
                </div>
                <textarea style="width:100%;border:1px solid var(--brand-border);border-radius:8px;padding:8px;font-size:13px;resize:vertical;min-height:60px;box-sizing:border-box;"
                          placeholder="寫下您的使用心得（選填）..."
                          [(ngModel)]="ratingComment"></textarea>
                <div style="display:flex;gap:8px;margin-top:8px;justify-content:flex-end;">
                  @if (myRating()) {
                    <button mat-stroked-button style="font-size:12px;height:32px;" (click)="deleteRating()">刪除評分</button>
                    <button mat-flat-button color="primary" style="font-size:12px;height:32px;" (click)="submitRating()" [disabled]="ratingStars() === 0">更新評分</button>
                  } @else {
                    <button mat-flat-button color="primary" style="font-size:12px;height:32px;" (click)="submitRating()" [disabled]="ratingStars() === 0">送出評分</button>
                  }
                </div>
              </div>
            } @else {
              <div style="background:#f9fafb;border-radius:12px;padding:14px;margin-bottom:16px;border:1px solid var(--brand-border);text-align:center;">
                <a routerLink="/auth/login" style="color:var(--brand-primary);font-weight:600;font-size:13px;">登入後可以評分</a>
              </div>
            }

            <!-- Ratings List -->
            @if (ratings().length > 0) {
              @for (r of ratings(); track r.id) {
                <div style="border-bottom:1px solid var(--brand-border);padding:12px 0;">
                  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
                    <span style="font-size:13px;font-weight:600;color:var(--brand-text);">{{ r.displayName }}</span>
                    <span style="color:#f59e0b;font-size:14px;">{{ '★'.repeat(r.rating) }}{{ '☆'.repeat(5 - r.rating) }}</span>
                  </div>
                  @if (r.comment) {
                    <p style="font-size:13px;color:#6b7280;margin:0;line-height:1.55;">{{ r.comment }}</p>
                  }
                  <span style="font-size:11px;color:#9ca3af;">{{ r.createdAt.slice(0,10) }}</span>
                </div>
              }
              @if (ratingsTotal() > ratings().length) {
                <button mat-stroked-button style="margin-top:12px;width:100%;font-size:13px;" (click)="loadMoreRatings()">
                  載入更多評論
                </button>
              }
            } @else {
              <p style="font-size:13px;color:var(--brand-muted);text-align:center;padding:16px 0;">尚無評論，成為第一個評分者！</p>
            }
          </section>
          <mat-divider />

          <!-- Related skills -->
          @if (related().length > 0) {
            <section>
              <p class="section-title">
                <mat-icon class="text-[var(--brand-accent)]">auto_awesome</mat-icon>
                相關技能
              </p>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                @for (s of related(); track s.id) {
                  <app-skill-card [skill]="s" />
                }
              </div>
            </section>
          }
        </div>

        <!-- Sidebar: meta -->
        <aside style="display:flex;flex-direction:column;gap:16px;">
          <div style="background:#fff;border-radius:16px;border:1px solid var(--brand-border);padding:20px;">
            <p class="section-title" style="margin-bottom:12px;">
              <mat-icon style="color:var(--brand-primary);">info</mat-icon>
              技能資訊
            </p>
            <mat-divider />
            @for (row of metaRows(); track row.label) {
              <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--brand-border);">
                <span style="font-size:13px;color:var(--brand-muted);">{{ row.label }}</span>
                <span [style.color]="row.color || 'var(--brand-text)'"
                      style="font-size:13px;font-weight:600;">{{ row.value }}</span>
              </div>
            }
            <div style="display:flex;justify-content:space-between;padding-top:12px;">
              <span style="font-size:13px;color:var(--brand-muted);">總下載</span>
              <span style="font-size:13px;font-weight:700;color:var(--brand-primary);">{{ skill()!.installCount | number }}</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding-top:6px;">
              <span style="font-size:13px;color:var(--brand-muted);">24h 下載</span>
              <span style="font-size:13px;font-weight:700;color:#14b8a6;">{{ skill()!.installs24h | number }}</span>
            </div>
          </div>

          <!-- Compatible tools -->
          <div style="background:#fff;border-radius:16px;border:1px solid var(--brand-border);padding:20px;">
            <p class="section-title" style="margin-bottom:14px;">
              <mat-icon style="color:var(--brand-primary);">devices</mat-icon>
              相容工具
            </p>
            <div style="display:flex;flex-wrap:wrap;gap:8px;">
              @for (tool of skill()!.compatibleTools; track tool) {
                <span style="background:#eef2ff;color:#4f46e5;border-radius:6px;padding:4px 12px;font-size:12px;font-weight:500;text-transform:capitalize;">{{ tool }}</span>
              }
            </div>
          </div>

          <!-- Version History -->
          @if (versions().length > 0) {
            <mat-expansion-panel style="background:#fff;border-radius:16px;border:1px solid var(--brand-border);box-shadow:none;">
              <mat-expansion-panel-header>
                <mat-panel-title style="font-size:14px;font-weight:700;color:var(--brand-text);display:flex;align-items:center;gap:6px;">
                  <mat-icon style="font-size:16px;width:16px;height:16px;color:var(--brand-primary);">history</mat-icon>
                  版本歷史（{{ versions().length }}）
                </mat-panel-title>
              </mat-expansion-panel-header>
              @for (v of versions(); track v.id) {
                <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--brand-border);font-size:12px;">
                  <span style="font-weight:600;color:var(--brand-primary);">v{{ v.version }}</span>
                  <span style="color:var(--brand-muted);">{{ v.createdAt.slice(0,10) }}</span>
                </div>
              }
            </mat-expansion-panel>
          }

          <!-- 安裝方式 -->
          <div style="background:#fff;border-radius:16px;border:1px solid var(--brand-border);padding:20px;">
            <p class="section-title" style="margin-bottom:12px;">
              <mat-icon style="color:var(--brand-primary);">terminal</mat-icon>
              安裝方式
            </p>
            <p style="font-size:12px;color:var(--brand-muted);margin:0 0 8px;">使用 CLI 一鍵安裝到本機：</p>
            <div style="background:#1e1b4b;border-radius:8px;padding:10px 14px;display:flex;align-items:center;justify-content:space-between;gap:8px;">
              <code style="font-family:monospace;font-size:12px;color:#e0e7ff;word-break:break-all;">{{ installCommand() }}</code>
              <button mat-icon-button (click)="copyInstallCommand()"
                      style="color:rgba(255,255,255,0.7);flex-shrink:0;width:32px;height:32px;"
                      aria-label="複製指令">
                <mat-icon style="font-size:16px;width:16px;height:16px;">content_copy</mat-icon>
              </button>
            </div>
          </div>
        </aside>
      </div>
    } @else {
      <!-- 404 -->
      <div class="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <span class="text-7xl">😕</span>
        <h2 class="text-2xl font-bold text-[var(--brand-text)]">找不到這個技能</h2>
        <button mat-flat-button color="primary" (click)="goBack()">回到首頁</button>
      </div>
    }
  `,
})
export class SkillDetailComponent implements OnInit {
  private route         = inject(ActivatedRoute);
  private router        = inject(Router);
  private skillService  = inject(SkillService);
  private ratingService = inject(RatingService);
  private snackBar      = inject(MatSnackBar);
  private dialog        = inject(MatDialog);
  protected auth        = inject(AuthService);
  private favSvc        = inject(FavoriteService);

  skill        = signal<SkillDetail | null>(null);
  related      = signal<SkillSummary[]>([]);
  versions     = signal<SkillVersionDto[]>([]);
  ratings      = signal<RatingDto[]>([]);
  ratingsTotal = signal(0);
  ratingsPage  = signal(0);
  myRating     = signal<RatingDto | null>(null);
  ratingStars  = signal(0);
  ratingComment = '';
  loading      = signal(true);
  favorited = computed(() => {
    const id = this.skill()?.id;
    return id ? this.favSvc.isFavorited(id) : false;
  });

  isAuthor = computed(() => {
    const authorId = this.skill()?.authorId;
    const userId = this.auth.currentUser()?.id;
    return !!(authorId && userId && authorId === userId);
  });

  installCommand = computed(() => {
    const slug = this.skill()?.slug ?? '';
    return `npx @skill-hub/cli pull ${slug}`;
  });

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const slug = params.get('slug')!;
      this.loading.set(true);
      this.skill.set(null);
      this.related.set([]);

      this.skillService.getSkillDetail(slug).subscribe({
        next: s => {
          this.skill.set(s);
          this.loading.set(false);
          this.loadRelated(slug);
          this.loadVersionHistory(slug);
          this.loadRatings(slug);
        },
        error: () => {
          this.skill.set(null);
          this.loading.set(false);
        },
      });
    });
  }

  private loadRelated(slug: string): void {
    this.skillService.getRelatedSkills(slug).subscribe({
      next: r => this.related.set(r.skills),
      error: () => {},
    });
  }

  private loadVersionHistory(slug: string): void {
    this.skillService.getVersionHistory(slug).subscribe({
      next: r => this.versions.set(r.versions),
      error: () => {},
    });
  }

  private loadRatings(slug: string, page = 0): void {
    this.ratingService.getRatings(slug, page).subscribe({
      next: r => {
        this.ratings.update(prev => page === 0 ? r.ratings : [...prev, ...r.ratings]);
        this.ratingsTotal.set(r.total);
        this.ratingsPage.set(page);
        const userId = this.auth.currentUser()?.id;
        if (userId) {
          const mine = r.ratings.find(rt => rt.userId === userId);
          if (mine) { this.myRating.set(mine); this.ratingStars.set(mine.rating); this.ratingComment = mine.comment ?? ''; }
        }
      },
      error: () => {},
    });
  }

  loadMoreRatings(): void {
    const slug = this.skill()?.slug;
    if (slug) this.loadRatings(slug, this.ratingsPage() + 1);
  }

  setRatingStar(star: number): void {
    this.ratingStars.set(star);
  }

  submitRating(): void {
    const slug = this.skill()?.slug;
    if (!slug || this.ratingStars() === 0) return;
    const obs = this.myRating()
      ? this.ratingService.updateRating(slug, this.ratingStars(), this.ratingComment || undefined)
      : this.ratingService.submitRating(slug, this.ratingStars(), this.ratingComment || undefined);
    obs.subscribe({
      next: r => {
        this.myRating.set(r);
        this.snackBar.open('評分已送出', '', { duration: 2000 });
        this.loadRatings(slug);
      },
      error: err => {
        if (err.status === 409) this.snackBar.open('您已評分過此技能', '', { duration: 3000 });
        else this.snackBar.open('評分失敗', '', { duration: 3000 });
      },
    });
  }

  deleteRating(): void {
    const slug = this.skill()?.slug;
    if (!slug) return;
    this.ratingService.deleteRating(slug).subscribe({
      next: () => {
        this.myRating.set(null);
        this.ratingStars.set(0);
        this.ratingComment = '';
        this.snackBar.open('評分已刪除', '', { duration: 2000 });
        this.loadRatings(slug);
      },
    });
  }

  goToEdit(): void {
    const slug = this.skill()?.slug;
    if (slug) this.router.navigate(['/skills', slug, 'edit']);
  }

  confirmDelete(): void {
    const skill = this.skill();
    if (!skill) return;
    if (!confirm(`確定要刪除「${skill.name}」嗎？此操作無法復原。`)) return;
    this.skillService.deleteSkill(skill.slug).subscribe({
      next: () => {
        this.snackBar.open('技能已刪除', '', { duration: 3000 });
        this.router.navigate(['/']);
      },
      error: () => this.snackBar.open('刪除失敗', '', { duration: 3000 }),
    });
  }

  toggleFavorite(): void {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/auth/login']);
      return;
    }
    const skillId = this.skill()?.id;
    if (!skillId) return;
    const wasAdding = !this.favorited();
    const req = wasAdding
      ? this.favSvc.addFavorite(skillId)
      : this.favSvc.removeFavorite(skillId);
    req.subscribe({
      next: () => this.snackBar.open(wasAdding ? '已加入收藏' : '已移除收藏', '', { duration: 2000 }),
      error: () => {},
    });
  }

  metaRows() {
    const s = this.skill();
    if (!s) return [];
    return [
      { label: '分類', value: s.category.name, color: '' },
      { label: '版本', value: `v${s.version}`, color: 'var(--brand-primary)' },
      { label: '作者', value: s.author, color: '' },
      { label: '發布', value: s.createdAt?.slice(0, 10).replace(/-/g, '/'), color: '' },
      ...(s.updatedAt ? [{ label: '更新', value: s.updatedAt.slice(0, 10).replace(/-/g, '/'), color: '' }] : []),
    ];
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

  downloadSkill(): void {
    const slug = this.skill()?.slug ?? '';
    this.skillService.getSkillDownload(slug).subscribe({
      next: res => {
        const blob = new Blob([res.content], { type: 'text/markdown; charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'SKILL.md';
        a.click();
        URL.revokeObjectURL(url);
        this.snackBar.open('開始下載 SKILL.md 檔案…', '', { duration: 2500 });
      },
      error: () => this.snackBar.open('下載失敗，請稍後再試', '', { duration: 3000 }),
    });
  }

  copyInstallCommand(): void {
    navigator.clipboard.writeText(this.installCommand()).then(() => {
      this.snackBar.open('已複製安裝指令', '', { duration: 2000 });
    });
  }

  openReportDialog(): void {
    const reason = prompt('請描述舉報原因（最多 500 字）：');
    if (!reason?.trim()) return;
    const slug = this.skill()?.slug;
    if (!slug) return;
    this.skillService.reportSkill(slug, reason.trim()).subscribe({
      next: () => this.snackBar.open('舉報已提交', '', { duration: 3000 }),
      error: err => {
        if (err.status === 409) this.snackBar.open('您已舉報過此技能', '', { duration: 3000 });
        else this.snackBar.open('舉報失敗，請稍後再試', '', { duration: 3000 });
      },
    });
  }
}
