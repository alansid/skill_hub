import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('isLoggedIn is false when no stored user', () => {
    expect(service.isLoggedIn()).toBe(false);
    expect(service.currentUser()).toBeNull();
  });

  it('login stores token and sets currentUser signal', () => {
    const mockResp = {
      token: 'jwt-token',
      user: { id: '1', email: 'a@b.com', displayName: 'Alice', avatarUrl: null, provider: 'LOCAL' as const },
    };
    service.login('a@b.com', 'password123').subscribe();
    httpMock.expectOne('/api/v1/auth/login').flush(mockResp);

    expect(service.isLoggedIn()).toBe(true);
    expect(service.currentUser()?.email).toBe('a@b.com');
    expect(localStorage.getItem('skillhub_token')).toBe('jwt-token');
  });

  it('logout clears token and resets currentUser to null', () => {
    localStorage.setItem('skillhub_token', 'tok');
    localStorage.setItem('skillhub_user', JSON.stringify({ id: '1', displayName: 'X', provider: 'LOCAL' }));

    service.logout();

    expect(service.isLoggedIn()).toBe(false);
    expect(localStorage.getItem('skillhub_token')).toBeNull();
  });

  it('register calls /auth/register and stores token', () => {
    const mockResp = {
      token: 'new-token',
      user: { id: '2', email: 'b@c.com', displayName: 'Bob', avatarUrl: null, provider: 'LOCAL' as const },
    };
    service.register('b@c.com', 'password123', 'Bob').subscribe();
    httpMock.expectOne('/api/v1/auth/register').flush(mockResp);

    expect(service.currentUser()?.displayName).toBe('Bob');
  });
});
