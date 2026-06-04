import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule,
    MatButtonModule, MatInputModule, MatFormFieldModule,
    MatIconModule, MatDividerModule, MatProgressSpinnerModule],
  styles: [`
    :host { display: block; }
    .page-wrap {
      min-height: 100vh;
      background: linear-gradient(160deg, #eef2ff 0%, #f5f3ff 50%, #ecfdf5 100%);
      display: flex; align-items: center; justify-content: center;
      padding: 24px;
    }
    .card {
      width: 100%; max-width: 420px;
      background: #fff;
      border-radius: 20px;
      box-shadow: 0 8px 40px rgba(99,102,241,.12), 0 2px 8px rgba(0,0,0,.06);
      overflow: hidden;
    }
    .card-top {
      background: linear-gradient(135deg, #6366f1 0%, #818cf8 60%, #14b8a6 100%);
      padding: 32px 32px 28px;
      text-align: center;
    }
    .card-body { padding: 28px 32px 32px; }
    .brand-icon { font-size: 36px; line-height: 1; }
    .brand-name {
      font-size: 22px; font-weight: 800; color: #fff;
      margin: 8px 0 4px; letter-spacing: -0.3px;
    }
    .brand-sub { font-size: 13px; color: rgba(255,255,255,0.75); }

    .field-wrap { margin-bottom: 16px; }
    .field-label { font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 6px; }
    .field-input {
      width: 100%; height: 44px;
      border: 1.5px solid #e5e7eb; border-radius: 10px;
      padding: 0 14px; font-size: 14px; color: #111827;
      outline: none; box-sizing: border-box;
      transition: border-color .2s, box-shadow .2s;
    }
    .field-input:focus {
      border-color: #6366f1;
      box-shadow: 0 0 0 3px rgba(99,102,241,.15);
    }

    .submit-btn {
      width: 100%; height: 48px;
      background: linear-gradient(135deg, #6366f1, #818cf8) !important;
      color: #fff !important; font-weight: 700 !important;
      font-size: 15px !important; border-radius: 12px !important;
      border: none; cursor: pointer; letter-spacing: 0.2px;
      box-shadow: 0 4px 14px rgba(99,102,241,.35) !important;
      transition: opacity .15s;
    }
    .submit-btn:hover { opacity: .92; }
    .submit-btn:disabled { opacity: .55; cursor: not-allowed; }

    .divider-row {
      display: flex; align-items: center; gap: 12px;
      margin: 20px 0;
      color: #9ca3af; font-size: 12px; font-weight: 500;
    }
    .divider-row::before, .divider-row::after {
      content: ''; flex: 1; height: 1px; background: #e5e7eb;
    }

    .github-btn {
      width: 100%; height: 44px;
      background: #f9fafb !important;
      border: 1.5px solid #e5e7eb !important;
      border-radius: 10px !important;
      font-size: 14px !important; font-weight: 600 !important;
      color: #374151 !important; cursor: pointer;
      display: flex !important; align-items: center; justify-content: center; gap: 8px;
    }
    .github-btn:hover { background: #f3f4f6 !important; }

    .error-box {
      background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px;
      padding: 10px 14px; font-size: 13px; color: #dc2626;
      margin-bottom: 16px; text-align: center;
    }
    .footer-text {
      text-align: center; font-size: 13px; color: #6b7280; margin-top: 20px;
    }
    .footer-link {
      color: #6366f1; font-weight: 600; text-decoration: none;
    }
    .footer-link:hover { text-decoration: underline; }
  `],
  template: `
    <div class="page-wrap">
      <div class="card">
        <!-- Top brand strip -->
        <div class="card-top">
          <div class="brand-icon">⚡</div>
          <div class="brand-name">SkillHub</div>
          <div class="brand-sub">AI 技能庫 · 登入你的帳號</div>
        </div>

        <!-- Form body -->
        <div class="card-body">
          @if (error()) {
            <div class="error-box">{{ error() }}</div>
          }

          <form (ngSubmit)="submit()">
            <div class="field-wrap">
              <div class="field-label">Email</div>
              <input class="field-input" type="email" [(ngModel)]="email"
                     name="email" placeholder="your@email.com" required />
            </div>
            <div class="field-wrap">
              <div class="field-label">密碼</div>
              <input class="field-input" type="password" [(ngModel)]="password"
                     name="password" placeholder="••••••••" required />
            </div>

            <button class="submit-btn" type="submit" [disabled]="loading()">
              @if (loading()) { 登入中… } @else { 登入 }
            </button>
          </form>

          <div class="divider-row">或</div>

          <button class="github-btn" (click)="loginWithGitHub()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
            </svg>
            使用 GitHub 登入
          </button>

          <p class="footer-text">
            還沒有帳號？
            <a routerLink="/auth/register" class="footer-link">立即註冊</a>
          </p>
        </div>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router      = inject(Router);

  email    = '';
  password = '';
  loading  = signal(false);
  error    = signal('');

  submit(): void {
    this.loading.set(true);
    this.error.set('');
    this.authService.login(this.email, this.password).subscribe({
      next: () => this.router.navigate(['/']),
      error: () => {
        this.error.set('Email 或密碼錯誤');
        this.loading.set(false);
      },
    });
  }

  loginWithGitHub(): void {
    this.authService.loginWithGitHub();
  }
}
