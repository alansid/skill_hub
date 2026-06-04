import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { LoginComponent } from './login.component';
import { AuthService } from '../../../core/services/auth.service';

const mockAuthResponse = {
  token: 'tok',
  user: { id: '1', email: 'a@b.com', displayName: 'Alice', avatarUrl: null, provider: 'LOCAL' as const },
};

describe('LoginComponent', () => {
  const setup = (loginResult: 'success' | 'error') => {
    const mockAuth = {
      login: () =>
        loginResult === 'success'
          ? of(mockAuthResponse)
          : throwError(() => ({ status: 401 })),
      loginWithGitHub: () => {},
    };
    TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        provideAnimationsAsync(),
        { provide: AuthService, useValue: mockAuth },
      ],
    });
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    return fixture;
  };

  it('renders email and password inputs', () => {
    const fixture = setup('success');
    const inputs = fixture.nativeElement.querySelectorAll('input');
    expect(inputs.length).toBeGreaterThanOrEqual(2);
  });

  it('renders GitHub login button', () => {
    const fixture = setup('success');
    expect(fixture.nativeElement.textContent).toContain('GitHub');
  });

  it('shows error message on failed login', async () => {
    const fixture = setup('error');
    const component = fixture.componentInstance;
    component.email = 'bad@bad.com';
    component.password = 'wrongpass';
    component.submit();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Email 或密碼錯誤');
  });

  it('loading signal is false after error', async () => {
    const fixture = setup('error');
    const component = fixture.componentInstance;
    component.submit();
    await fixture.whenStable();
    expect(component.loading()).toBe(false);
  });
});
