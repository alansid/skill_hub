import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { CallbackComponent } from './callback.component';
import { AuthService } from '../../../core/services/auth.service';

describe('CallbackComponent', () => {
  const setup = (token: string | null) => {
    const mockAuth = { handleOAuthToken: vi.fn() };
    TestBed.configureTestingModule({
      imports: [CallbackComponent],
      providers: [
        provideRouter([]),
        provideAnimationsAsync(),
        { provide: AuthService, useValue: mockAuth },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: convertToParamMap(token ? { token } : {}) },
            paramMap: of(convertToParamMap({})),
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(CallbackComponent);
    fixture.detectChanges();
    return { fixture, mockAuth };
  };

  it('calls handleOAuthToken with token from query param', () => {
    const { mockAuth } = setup('my-jwt-token');
    expect(mockAuth.handleOAuthToken).toHaveBeenCalledWith('my-jwt-token');
  });

  it('does not call handleOAuthToken when no token param', () => {
    const { mockAuth } = setup(null);
    expect(mockAuth.handleOAuthToken).not.toHaveBeenCalled();
  });

  it('renders a spinner', () => {
    const { fixture } = setup(null);
    expect(fixture.nativeElement.querySelector('mat-spinner')).not.toBeNull();
  });
});
