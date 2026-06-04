import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatDividerModule } from '@angular/material/divider';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';

import { SkillService } from '../../core/services/skill.service';
import { AuthService } from '../../core/services/auth.service';
import { FavoriteService } from '../../core/services/favorite.service';
import { SearchBarComponent } from '../../shared/components/search-bar/search-bar.component';
import { SortTabsComponent } from '../../shared/components/sort-tabs/sort-tabs.component';
import { FilterPanelComponent } from '../../shared/components/filter-panel/filter-panel.component';
import { SkillGridComponent } from '../../shared/components/skill-grid/skill-grid.component';
import { CollectionCarouselComponent } from '../../shared/components/collection-carousel/collection-carousel.component';
import {
  CategoryModel,
  CollectionWithSkills,
  SkillQueryParams,
  SkillSummary,
  TagModel,
} from '../../shared/models/skill.model';

@Component({
  selector: 'app-marketplace',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatSidenavModule,
    MatDividerModule,
    MatPaginatorModule,
    MatTooltipModule,
    RouterModule,
    SearchBarComponent,
    SortTabsComponent,
    FilterPanelComponent,
    SkillGridComponent,
    CollectionCarouselComponent,
  ],
  template: `
    <!-- Toolbar -->
    <mat-toolbar class="app-toolbar sticky top-0 z-50" style="height:64px;min-height:64px;">
      <!-- Logo -->
      <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
        <span style="font-size:24px;line-height:1;">⚡</span>
        <span style="font-size:18px;font-weight:800;color:#fff;letter-spacing:-0.3px;">SkillHub</span>
        <span style="display:inline-flex;align-items:center;font-size:11px;font-weight:500;
                     background:rgba(255,255,255,0.2);color:#fff;border-radius:20px;
                     padding:2px 10px;margin-left:4px;">Marketplace</span>
      </div>
      <!-- Spacer -->
      <span style="flex:1;"></span>
      <!-- Search -->
      <app-search-bar style="width:320px;display:block;" (search)="onSearch($event)" />
      <!-- Auth controls -->
      @if (auth.isLoggedIn()) {
        <a routerLink="/publish"
           style="display:inline-flex;align-items:center;gap:6px;margin-left:12px;
                  color:#fff;text-decoration:none;cursor:pointer;
                  background:rgba(255,255,255,0.18);border-radius:20px;
                  padding:4px 14px 4px 10px;transition:background .15s;font-size:13px;font-weight:600;">
          <mat-icon style="font-size:16px;width:16px;height:16px;">upload</mat-icon>
          Publish
        </a>
        <a routerLink="/profile"
           style="display:inline-flex;align-items:center;gap:6px;margin-left:12px;
                  color:#fff;text-decoration:none;cursor:pointer;
                  background:rgba(255,255,255,0.12);border-radius:20px;
                  padding:4px 14px 4px 10px;transition:background .15s;"
           onmouseover="this.style.background='rgba(255,255,255,0.2)'"
           onmouseout="this.style.background='rgba(255,255,255,0.12)'">
          <mat-icon style="font-size:16px;width:16px;height:16px;color:#f9a8d4;">favorite</mat-icon>
          <span style="font-size:13px;font-weight:600;">我的收藏</span>
          <div style="width:24px;height:24px;border-radius:50%;background:rgba(255,255,255,0.22);
                      display:flex;align-items:center;justify-content:center;
                      font-weight:700;font-size:11px;margin-left:2px;">
            {{ auth.currentUser()?.displayName?.charAt(0)?.toUpperCase() }}
          </div>
        </a>
        <button mat-icon-button matTooltip="登出"
                style="margin-left:4px;color:rgba(255,255,255,0.75);"
                (click)="auth.logout()">
          <mat-icon style="font-size:20px;">logout</mat-icon>
        </button>
      } @else {
        <button mat-stroked-button routerLink="/auth/login"
                style="margin-left:12px;color:#fff;border-color:rgba(255,255,255,0.5);
                       font-size:13px;height:34px;">
          登入
        </button>
        <button mat-flat-button routerLink="/auth/register"
                style="margin-left:8px;background:rgba(255,255,255,0.15);color:#fff;
                       font-size:13px;height:34px;">
          註冊
        </button>
      }
    </mat-toolbar>

    <mat-sidenav-container style="min-height:calc(100vh - 64px);">
      <!-- Sidebar filter -->
      <mat-sidenav mode="side" opened style="width:256px;padding:20px 16px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;">
          <mat-icon style="color:var(--brand-primary);font-size:18px;width:18px;height:18px;">tune</mat-icon>
          <h3 style="font-size:13px;font-weight:700;color:var(--brand-text);margin:0;">篩選條件</h3>
        </div>
        <app-filter-panel
          [categories]="categories()"
          [tags]="tags()"
          [selectedCategory]="query().category ?? null"
          [selectedTags]="selectedTags()"
          (categoryChange)="onCategoryChange($event)"
          (tagChange)="onTagChange($event)"
        />
      </mat-sidenav>

      <!-- Main content -->
      <mat-sidenav-content style="padding:24px;background:var(--brand-bg);">
        <!-- Mobile search -->
        <app-search-bar class="block md:hidden mb-4" (search)="onSearch($event)" />

        <!-- Collections -->
        @if (collections().length > 0) {
          <section class="mb-8">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
              <span style="font-size:18px;">✨</span>
              <h2 style="font-size:16px;font-weight:700;color:var(--brand-text);margin:0;">精選 Collections</h2>
            </div>
            <app-collection-carousel [collections]="collections()" />
          </section>
          <mat-divider class="mb-6 opacity-50" />
        }

        <!-- Sort tabs -->
        <app-sort-tabs
          [value]="query().sort ?? 'trending'"
          (valueChange)="onSortChange($event)"
        />

        <!-- Results count -->
        @if (total() > 0 && !loading()) {
          <p style="font-size:12px;color:var(--brand-muted);margin:10px 0 4px;">
            共 {{ total() }} 個技能
          </p>
        }

        <!-- Skill grid -->
        <div class="mt-2">
          <app-skill-grid [skills]="skills()" [loading]="loading()" />
        </div>

        <!-- Paginator -->
        @if (total() > 0) {
          <mat-paginator
            class="mt-6 rounded-xl bg-white border border-[var(--brand-border)]"
            [length]="total()"
            [pageSize]="query().pageSize ?? 24"
            [pageIndex]="query().page ?? 0"
            [pageSizeOptions]="[12, 24, 48]"
            (page)="onPage($event)"
          />
        }
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
})
export class MarketplaceComponent implements OnInit {
  private skillService = inject(SkillService);
  readonly auth = inject(AuthService);
  private favSvc = inject(FavoriteService);

  skills = signal<SkillSummary[]>([]);
  collections = signal<CollectionWithSkills[]>([]);
  categories = signal<CategoryModel[]>([]);
  tags = signal<TagModel[]>([]);
  total = signal(0);
  loading = signal(false);
  selectedTags = signal<string[]>([]);

  query = signal<SkillQueryParams>({ sort: 'trending', page: 0, pageSize: 24 });

  ngOnInit(): void {
    if (this.auth.isLoggedIn()) this.favSvc.loadFavorites();
    this.loadMeta();
    this.loadCollections();
    this.loadSkills();
  }

  private loadMeta(): void {
    this.skillService.getCategories().subscribe(r => this.categories.set(r.categories));
    this.skillService.getTags().subscribe(r => this.tags.set(r.tags));
  }

  private loadCollections(): void {
    this.skillService.getCollections().subscribe(r => this.collections.set(r.collections));
  }

  private loadSkills(): void {
    this.loading.set(true);
    this.skillService.getSkills(this.query()).subscribe({
      next: r => {
        this.skills.set(r.skills);
        this.total.set(r.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onSearch(q: string): void {
    this.query.update(prev => ({ ...prev, q: q || undefined, page: 0 }));
    this.loadSkills();
  }

  onSortChange(sort: 'trending' | 'latest' | 'top'): void {
    this.query.update(prev => ({ ...prev, sort, page: 0 }));
    this.loadSkills();
  }

  onCategoryChange(category: string | null): void {
    this.query.update(prev => ({ ...prev, category: category ?? undefined, page: 0 }));
    this.loadSkills();
  }

  onTagChange(tags: string[]): void {
    this.selectedTags.set(tags);
    this.query.update(prev => ({ ...prev, tag: tags[0] ?? undefined, page: 0 }));
    this.loadSkills();
  }

  onPage(event: PageEvent): void {
    this.query.update(prev => ({ ...prev, page: event.pageIndex, pageSize: event.pageSize }));
    this.loadSkills();
  }
}
