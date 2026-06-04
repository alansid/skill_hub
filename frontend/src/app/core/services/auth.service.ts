import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { AuthResponse, CurrentUser } from '../../shared/models/user.model';

const TOKEN_KEY = 'skillhub_token';
const BASE = '/api/v1/auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http   = inject(HttpClient);
  private router = inject(Router);

  private _user = signal<CurrentUser | null>(this.loadStoredUser());

  readonly currentUser = this._user.asReadonly();
  readonly isLoggedIn  = computed(() => this._user() !== null);

  register(email: string, password: string, displayName: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${BASE}/register`, { email, password, displayName }).pipe(
      tap(res => this.persist(res))
    );
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${BASE}/login`, { email, password }).pipe(
      tap(res => this.persist(res))
    );
  }

  loginWithGitHub(): void {
    window.location.href = `${BASE}/github`;
  }

  handleOAuthToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
    this.http.get<CurrentUser>(`${BASE}/me`).subscribe(user => {
      localStorage.setItem('skillhub_user', JSON.stringify(user));
      this._user.set(user);
      this.router.navigate(['/']);
    });
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('skillhub_user');
    this._user.set(null);
    this.router.navigate(['/']);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  private persist(res: AuthResponse): void {
    localStorage.setItem(TOKEN_KEY, res.token);
    localStorage.setItem('skillhub_user', JSON.stringify(res.user));
    this._user.set(res.user);
  }

  private loadStoredUser(): CurrentUser | null {
    try {
      const raw = localStorage.getItem('skillhub_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}
