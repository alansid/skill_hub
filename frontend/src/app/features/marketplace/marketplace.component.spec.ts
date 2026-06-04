import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MarketplaceComponent } from './marketplace.component';
import { SkillService } from '../../core/services/skill.service';
import { AuthService } from '../../core/services/auth.service';
import { FavoriteService } from '../../core/services/favorite.service';

const MOCK_SKILLS = [
  {
    id: 's1', slug: 'tdd', name: 'TDD Starter', description: 'TDD skill', author: 'test',
    version: '1.0.0', installCount: 100, compatibleTools: ['claude'], createdAt: '2026-01-01T00:00:00',
    category: { id: 'c1', name: 'Testing', slug: 'testing' }, tags: [],
  },
  {
    id: 's2', slug: 'react', name: 'React Guide', description: 'React skill', author: 'test',
    version: '1.0.0', installCount: 200, compatibleTools: ['claude'], createdAt: '2026-01-02T00:00:00',
    category: { id: 'c2', name: 'Frontend', slug: 'frontend' }, tags: [],
  },
];

const MOCK_CATEGORIES = [
  { id: 'c1', name: 'Testing', slug: 'testing' },
  { id: 'c2', name: 'Frontend', slug: 'frontend' },
];

const MOCK_TAGS = [
  { id: 't1', name: 'TDD', type: 'PROBLEM_SPACE' },
  { id: 't2', name: 'React', type: 'LANGUAGE' },
];

const MOCK_COLLECTIONS = [
  {
    id: 'col1', name: 'Trending Skills', slug: 'trending-skills',
    skills: [MOCK_SKILLS[0]],
  },
];

const mockSkillService = {
  getSkills: vi.fn(() => of({ skills: MOCK_SKILLS, total: 2, page: 0, pageSize: 24 })),
  getCategories: vi.fn(() => of({ categories: MOCK_CATEGORIES })),
  getTags: vi.fn(() => of({ tags: MOCK_TAGS })),
  getCollections: vi.fn(() => of({ collections: MOCK_COLLECTIONS })),
};

describe('MarketplaceComponent', () => {
  const setup = (loggedIn: boolean) => {
    const mockAuth = { isLoggedIn: () => loggedIn, currentUser: signal(null), logout: vi.fn() };
    const mockFav = {
      loadFavorites: vi.fn(),
      isFavorited: () => false,
      addFavorite: () => of({ favorited: true }),
      removeFavorite: () => of({ favorited: false }),
    };
    TestBed.configureTestingModule({
      imports: [MarketplaceComponent],
      providers: [
        provideRouter([]),
        provideAnimationsAsync(),
        { provide: SkillService, useValue: mockSkillService },
        { provide: AuthService, useValue: mockAuth },
        { provide: FavoriteService, useValue: mockFav },
      ],
    });
    const fixture = TestBed.createComponent(MarketplaceComponent);
    fixture.detectChanges();
    return { fixture, mockFav };
  };

  it('renders the SkillHub toolbar with Marketplace badge', async () => {
    const { fixture } = setup(false);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('SkillHub');
    expect(fixture.nativeElement.textContent).toContain('Marketplace');
  });

  it('renders skill grid with loaded skills', async () => {
    const { fixture } = setup(false);
    await fixture.whenStable();
    fixture.detectChanges();
    const grid = fixture.debugElement.query(By.css('app-skill-grid'));
    expect(grid).not.toBeNull();
  });

  it('renders filter panel with categories', async () => {
    const { fixture } = setup(false);
    await fixture.whenStable();
    fixture.detectChanges();
    const filterPanel = fixture.debugElement.query(By.css('app-filter-panel'));
    expect(filterPanel).not.toBeNull();
  });

  it('renders sort tabs', async () => {
    const { fixture } = setup(false);
    await fixture.whenStable();
    fixture.detectChanges();
    const sortTabs = fixture.debugElement.query(By.css('app-sort-tabs'));
    expect(sortTabs).not.toBeNull();
  });

  it('shows login/register buttons when not logged in', async () => {
    const { fixture } = setup(false);
    await fixture.whenStable();
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('登入');
    expect(text).toContain('註冊');
  });

  it('calls loadFavorites when user is logged in', async () => {
    const { mockFav } = setup(true);
    expect(mockFav.loadFavorites).toHaveBeenCalled();
  });

  it('shows result count when skills are loaded', async () => {
    const { fixture } = setup(false);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('1 個技能');
  });
});
