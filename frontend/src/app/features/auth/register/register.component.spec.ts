import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { RegisterComponent } from './register.component';
import { AuthService } from '../../../core/services/auth.service';

const mockAuthResponse = {
  token: 'tok',
  user: { id: '2', email: 'b@c.com', displayName: 'Bob', avatarUrl: null, provider: 'LOCAL' as const },
};

describe('RegisterComponent', () => {
  const setup = (result: 'success' | 'conflict' | 'error') => {
    const mockAuth = {
      register: () => {
        if (result === 'success') return of(mockAuthResponse);
        if (result === 'conflict') return throwError(() => ({ status: 409 }));
        return throwError(() => ({ status: 500 }));
      },
    };
    TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [
        provideRouter([]),
        provideAnimationsAsync(),
        { provide: AuthService, useValue: mockAuth },
      ],
    });
    const fixture = TestBed.createComponent(RegisterComponent);
    fixture.detectChanges();
    return fixture;
  };

  it('renders displayName, email and password inputs', () => {
    const fixture = setup('success');
    const inputs = fixture.nativeElement.querySelectorAll('input');
    expect(inputs.length).toBeGreaterThanOrEqual(3);
  });

  it('shows conflict error when email is already in use', async () => {
    const fixture = setup('conflict');
    const component = fixture.componentInstance;
    component.displayName = 'Bob';
    component.email = 'exists@test.com';
    component.password = 'password123';
    component.submit();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Email 已被使用');
  });

  it('shows generic error on server failure', async () => {
    const fixture = setup('error');
    const component = fixture.componentInstance;
    component.displayName = 'Bob';
    component.email = 'new@test.com';
    component.password = 'password123';
    component.submit();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('註冊失敗');
  });

  it('loading signal is false after error', async () => {
    const fixture = setup('error');
    const component = fixture.componentInstance;
    component.submit();
    await fixture.whenStable();
    expect(component.loading()).toBe(false);
  });
});
