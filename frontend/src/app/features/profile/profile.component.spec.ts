import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { ProfileComponent } from './profile.component';
import { AuthService } from '../../core/services/auth.service';
import { FavoriteService } from '../../core/services/favorite.service';
import { SkillSummary } from '../../shared/models/skill.model';

const MOCK_USER = {
  id: '1', email: 'alice@test.com', displayName: 'Alice', avatarUrl: null, provider: 'LOCAL' as const,
};

const MOCK_SKILL: SkillSummary = {
  id: 's1', slug: 'tdd', name: 'TDD Starter', description: 'TDD skill', author: 'test',
  version: '1.0.0', installCount: 100, compatibleTools: ['claude'], createdAt: '2026-01-01T00:00:00',
  category: { id: 'c1', name: 'Testing', slug: 'testing' }, tags: [],
};

describe('ProfileComponent', () => {
  const setup = (favorites: SkillSummary[]) => {
    const mockAuth = { currentUser: signal(MOCK_USER), logout: vi.fn(), isLoggedIn: () => true };
    const mockFav = {
      getFavorites: () => of({ skills: favorites }),
      isFavorited: () => false,
      addFavorite: () => of({ favorited: true }),
      removeFavorite: () => of({ favorited: false }),
    };
    TestBed.configureTestingModule({
      imports: [ProfileComponent],
      providers: [
        provideRouter([]),
        provideAnimationsAsync(),
        { provide: AuthService, useValue: mockAuth },
        { provide: FavoriteService, useValue: mockFav },
      ],
    });
    const fixture = TestBed.createComponent(ProfileComponent);
    fixture.detectChanges();
    return fixture;
  };

  it('renders the user display name', async () => {
    const fixture = setup([]);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Alice');
  });

  it('renders the user email', async () => {
    const fixture = setup([]);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('alice@test.com');
  });

  it('shows empty state when no favorites', async () => {
    const fixture = setup([]);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('還沒有收藏的技能');
  });

  it('shows favorite count in stats', async () => {
    const fixture = setup([MOCK_SKILL]);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('1');
    expect(fixture.nativeElement.textContent).toContain('已收藏技能');
  });

  it('renders skill grid when favorites exist', async () => {
    const fixture = setup([MOCK_SKILL]);
    await fixture.whenStable();
    fixture.detectChanges();
    const grid = fixture.nativeElement.querySelector('app-skill-grid');
    expect(grid).not.toBeNull();
  });
});
