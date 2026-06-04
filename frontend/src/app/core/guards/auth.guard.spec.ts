import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { authGuard } from './auth.guard';

const setup = (loggedIn: boolean) => {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: AuthService, useValue: { isLoggedIn: () => loggedIn } },
    ],
  });
};

const run = () =>
  TestBed.runInInjectionContext(() =>
    authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
  );

describe('authGuard', () => {
  it('returns UrlTree to /auth/login when not logged in', () => {
    setup(false);
    const result = run();
    expect(result).toBeInstanceOf(UrlTree);
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/auth/login');
  });

  it('returns true when logged in', () => {
    setup(true);
    const result = run();
    expect(result).toBe(true);
  });
});
