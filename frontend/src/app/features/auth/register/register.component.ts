import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule,
    MatButtonModule, MatInputModule, MatFormFieldModule],
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
    .field-hint { font-size: 11px; color: #9ca3af; margin-top: 4px; }

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
          <div class="brand-sub">建立你的 SkillHub 帳號</div>
        </div>

        <!-- Form body -->
        <div class="card-body">
          @if (error()) {
            <div class="error-box">{{ error() }}</div>
          }

          <form (ngSubmit)="submit()">
            <div class="field-wrap">
              <div class="field-label">顯示名稱</div>
              <input class="field-input" type="text" [(ngModel)]="displayName"
                     name="displayName" placeholder="你的名字" required />
            </div>
            <div class="field-wrap">
              <div class="field-label">Email</div>
              <input class="field-input" type="email" [(ngModel)]="email"
                     name="email" placeholder="your@email.com" required />
            </div>
            <div class="field-wrap">
              <div class="field-label">密碼</div>
              <input class="field-input" type="password" [(ngModel)]="password"
                     name="password" placeholder="至少 8 個字元" required minlength="8" />
              <div class="field-hint">至少 8 個字元</div>
            </div>

            <button class="submit-btn" type="submit" [disabled]="loading()">
              @if (loading()) { 建立中… } @else { 建立帳號 }
            </button>
          </form>

          <p class="footer-text">
            已有帳號？
            <a routerLink="/auth/login" class="footer-link">立即登入</a>
          </p>
        </div>
      </div>
    </div>
  `,
})
export class RegisterComponent {
  private authService = inject(AuthService);
  private router      = inject(Router);

  displayName = '';
  email       = '';
  password    = '';
  loading     = signal(false);
  error       = signal('');

  submit(): void {
    this.loading.set(true);
    this.error.set('');
    this.authService.register(this.email, this.password, this.displayName).subscribe({
      next: () => this.router.navigate(['/']),
      error: (err) => {
        this.error.set(err.status === 409 ? 'Email 已被使用' : '註冊失敗，請再試一次');
        this.loading.set(false);
      },
    });
  }
}
