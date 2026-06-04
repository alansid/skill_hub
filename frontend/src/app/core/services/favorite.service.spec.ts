import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { FavoriteService } from './favorite.service';

describe('FavoriteService', () => {
  let service: FavoriteService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(FavoriteService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('isFavorited returns false when no favorites loaded', () => {
    expect(service.isFavorited('skill-1')).toBe(false);
  });

  it('loadFavorites populates the internal id set', () => {
    service.loadFavorites();
    httpMock.expectOne('/api/v1/users/me/favorites').flush({
      skills: [{ id: 'skill-1' }, { id: 'skill-2' }],
    });
    expect(service.isFavorited('skill-1')).toBe(true);
    expect(service.isFavorited('skill-2')).toBe(true);
    expect(service.isFavorited('skill-99')).toBe(false);
  });

  it('addFavorite optimistically sets isFavorited to true', () => {
    service.addFavorite('skill-3').subscribe();
    expect(service.isFavorited('skill-3')).toBe(true);
    httpMock.expectOne('/api/v1/users/me/favorites/skill-3').flush({ favorited: true });
  });

  it('addFavorite rolls back on HTTP error', () => {
    service.addFavorite('skill-4').subscribe({ error: () => {} });
    expect(service.isFavorited('skill-4')).toBe(true);
    httpMock.expectOne('/api/v1/users/me/favorites/skill-4').error(new ProgressEvent('error'));
    expect(service.isFavorited('skill-4')).toBe(false);
  });

  it('removeFavorite optimistically sets isFavorited to false', () => {
    service.addFavorite('skill-5').subscribe();
    httpMock.expectOne('/api/v1/users/me/favorites/skill-5').flush({ favorited: true });

    service.removeFavorite('skill-5').subscribe();
    expect(service.isFavorited('skill-5')).toBe(false);
    httpMock.expectOne('/api/v1/users/me/favorites/skill-5').flush({ favorited: false });
  });

  it('removeFavorite rolls back on HTTP error', () => {
    service.addFavorite('skill-6').subscribe();
    httpMock.expectOne('/api/v1/users/me/favorites/skill-6').flush({ favorited: true });

    service.removeFavorite('skill-6').subscribe({ error: () => {} });
    expect(service.isFavorited('skill-6')).toBe(false);
    httpMock.expectOne('/api/v1/users/me/favorites/skill-6').error(new ProgressEvent('error'));
    expect(service.isFavorited('skill-6')).toBe(true);
  });

  it('getFavorites returns an observable of skill list', () => {
    const mockSkills = [{ id: 's1', slug: 'tdd', name: 'TDD' }];
    let result: unknown;
    service.getFavorites().subscribe(r => (result = r));
    httpMock.expectOne('/api/v1/users/me/favorites').flush({ skills: mockSkills });
    expect(result).toEqual({ skills: mockSkills });
  });
});
