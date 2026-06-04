import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { SkillService } from '../../../core/services/skill.service';
import { CategoryModel } from '../../../shared/models/skill.model';

const SEMVER_PATTERN = /^\d+\.\d+\.\d+$/;

@Component({
  selector: 'app-edit-skill',
  standalone: true,
  imports: [
    CommonModule, RouterModule, ReactiveFormsModule,
    MatToolbarModule, MatButtonModule, MatInputModule,
    MatFormFieldModule, MatSelectModule, MatOptionModule,
    MatIconModule, MatSnackBarModule, MatProgressSpinnerModule,
  ],
  template: `
    <mat-toolbar style="background:linear-gradient(135deg,#6366f1 0%,#818cf8 100%);height:64px;min-height:64px;position:sticky;top:0;z-index:100;">
      <span style="font-size:18px;font-weight:800;color:#fff;">⚡ SkillHub</span>
      <span style="flex:1;"></span>
      <a [routerLink]="['/skills', slug()]" style="color:rgba(255,255,255,0.8);font-size:13px;font-weight:600;text-decoration:none;margin-right:16px;">← 返回詳情頁</a>
    </mat-toolbar>

    @if (loading()) {
      <div style="display:flex;justify-content:center;padding:80px;">
        <mat-spinner diameter="48" />
      </div>
    } @else {
      <div style="max-width:760px;margin:40px auto;padding:0 24px 64px;">
        <h1 style="font-size:24px;font-weight:800;color:#1e1b4b;margin-bottom:4px;">編輯技能</h1>
        <p style="color:#6b7280;margin-bottom:28px;">更新技能內容（版本號必須遞增）。</p>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" style="display:flex;flex-direction:column;gap:18px;">
          <mat-form-field appearance="outline">
            <mat-label>Name</mat-label>
            <input matInput formControlName="name" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Version（必須 > 目前版本）</mat-label>
            <input matInput formControlName="version" placeholder="e.g. 1.1.0" />
            <mat-hint>目前版本：{{ currentVersion() }}</mat-hint>
            @if (f['version'].invalid && f['version'].touched) {
              <mat-error>Semver format required (e.g. 1.1.0)</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Description</mat-label>
            <textarea matInput formControlName="description" rows="3"></textarea>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Category</mat-label>
            <mat-select formControlName="categorySlug">
              @for (cat of categories(); track cat.id) {
                <mat-option [value]="cat.slug">{{ cat.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Compatible Tools</mat-label>
            <mat-select formControlName="compatibleTools" [multiple]="true">
              @for (tool of TOOLS; track tool) {
                <mat-option [value]="tool">{{ tool }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>SKILL.md Content</mat-label>
            <textarea matInput formControlName="content" rows="10"></textarea>
          </mat-form-field>

          @if (serverError()) {
            <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px 16px;color:#dc2626;font-size:13px;">
              {{ serverError() }}
            </div>
          }

          <div style="display:flex;gap:12px;justify-content:flex-end;">
            <button mat-stroked-button type="button" [routerLink]="['/skills', slug()]">Cancel</button>
            <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || submitting()">
              @if (submitting()) { <mat-spinner diameter="18" style="display:inline-block;margin-right:6px;"></mat-spinner> }
              更新技能
            </button>
          </div>
        </form>
      </div>
    }
  `,
})
export class EditSkillComponent implements OnInit {
  private fb          = inject(FormBuilder);
  private skillSvc    = inject(SkillService);
  private router      = inject(Router);
  private route       = inject(ActivatedRoute);
  private snackBar    = inject(MatSnackBar);

  readonly TOOLS = ['claude', 'copilot', 'codex', 'opencode'];

  slug           = signal('');
  currentVersion = signal('');
  categories     = signal<CategoryModel[]>([]);
  loading        = signal(true);
  submitting     = signal(false);
  serverError    = signal('');
  form!: FormGroup;

  get f(): { [key: string]: AbstractControl } { return this.form.controls; }

  ngOnInit(): void {
    this.form = this.fb.group({
      name:            ['', Validators.required],
      version:         ['', [Validators.required, Validators.pattern(SEMVER_PATTERN)]],
      description:     [''],
      categorySlug:    [''],
      compatibleTools: [[]],
      content:         [''],
    });

    const s = this.route.snapshot.paramMap.get('slug')!;
    this.slug.set(s);

    this.skillSvc.getCategories().subscribe(r => this.categories.set(r.categories));
    this.skillSvc.getSkillDetail(s).subscribe({
      next: skill => {
        this.currentVersion.set(skill.version);
        this.form.patchValue({
          name: skill.name,
          version: skill.version,
          description: skill.description,
          categorySlug: skill.category.slug,
          compatibleTools: skill.compatibleTools,
          content: skill.content,
        });
        this.loading.set(false);
      },
      error: () => this.router.navigate(['/']),
    });
  }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.submitting.set(true);
    this.serverError.set('');

    this.skillSvc.updateSkill(this.slug(), this.form.value).subscribe({
      next: () => {
        this.snackBar.open('技能已更新', '', { duration: 3000 });
        this.router.navigate(['/skills', this.slug()]);
      },
      error: err => {
        this.submitting.set(false);
        if (err.status === 409) this.serverError.set('版本號必須高於目前版本。');
        else if (err.status === 403) this.serverError.set('您沒有權限編輯此技能。');
        else this.serverError.set('更新失敗，請稍後再試。');
      },
    });
  }
}
