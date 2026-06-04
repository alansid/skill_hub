import { Component, OnInit, inject, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule, NgFor } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
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
import { MatDividerModule } from '@angular/material/divider';

import { SkillService } from '../../core/services/skill.service';
import { CategoryModel, TagModel } from '../../shared/models/skill.model';

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SEMVER_PATTERN = /^\d+\.\d+\.\d+$/;

@Component({
  selector: 'app-publish-skill',
  standalone: true,
  imports: [
    CommonModule, NgFor, RouterModule, ReactiveFormsModule,
    MatToolbarModule, MatButtonModule, MatInputModule,
    MatFormFieldModule, MatSelectModule, MatOptionModule,
    MatIconModule, MatSnackBarModule, MatProgressSpinnerModule, MatDividerModule,
  ],
  template: `
    <mat-toolbar style="background:linear-gradient(135deg,#6366f1 0%,#818cf8 100%);height:64px;min-height:64px;position:sticky;top:0;z-index:100;">
      <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
        <span style="font-size:24px;">⚡</span>
        <span style="font-size:18px;font-weight:800;color:#fff;">SkillHub</span>
      </div>
      <span style="flex:1;"></span>
      <a routerLink="/" style="color:rgba(255,255,255,0.8);font-size:13px;font-weight:600;text-decoration:none;margin-right:16px;">← Marketplace</a>
    </mat-toolbar>

    <div style="max-width:760px;margin:40px auto;padding:0 24px 64px;">
      <h1 style="font-size:26px;font-weight:800;color:#1e1b4b;margin-bottom:4px;">Publish a Skill</h1>
      <p style="color:#6b7280;margin-bottom:32px;">Share your skill with the SkillHub community.</p>

      <form [formGroup]="form" (ngSubmit)="onSubmit()" style="display:flex;flex-direction:column;gap:20px;">

        <!-- Name -->
        <mat-form-field appearance="outline">
          <mat-label>Name</mat-label>
          <input matInput formControlName="name" placeholder="e.g. TDD Workflow" (input)="onNameInput()" />
          @if (f['name'].invalid && f['name'].touched) {
            <mat-error>{{ nameError() }}</mat-error>
          }
        </mat-form-field>

        <!-- Slug -->
        <mat-form-field appearance="outline">
          <mat-label>Slug</mat-label>
          <input matInput formControlName="slug" placeholder="e.g. tdd-workflow" />
          <mat-hint>Lowercase letters, numbers and hyphens only</mat-hint>
          @if (f['slug'].invalid && f['slug'].touched) {
            <mat-error>{{ slugError() }}</mat-error>
          }
        </mat-form-field>

        <!-- Description -->
        <mat-form-field appearance="outline">
          <mat-label>Description</mat-label>
          <textarea matInput formControlName="description" rows="3" placeholder="What does this skill do?"></textarea>
          @if (f['description'].invalid && f['description'].touched) {
            <mat-error>Required</mat-error>
          }
        </mat-form-field>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
          <!-- Version -->
          <mat-form-field appearance="outline">
            <mat-label>Version</mat-label>
            <input matInput formControlName="version" placeholder="1.0.0" />
            @if (f['version'].invalid && f['version'].touched) {
              <mat-error>Semver format required (e.g. 1.0.0)</mat-error>
            }
          </mat-form-field>

          <!-- Category -->
          <mat-form-field appearance="outline">
            <mat-label>Category</mat-label>
            <mat-select formControlName="categorySlug" [disabled]="categories().length === 0">
              <mat-option *ngFor="let cat of categories()" [value]="cat.slug">
                {{ cat.name }}
              </mat-option>
            </mat-select>
            @if (categories().length === 0) {
              <mat-hint>Loading...</mat-hint>
            }
            @if (f['categorySlug'].invalid && f['categorySlug'].touched) {
              <mat-error>Required</mat-error>
            }
          </mat-form-field>
        </div>

        <!-- Compatible Tools (multi-select) -->
        <mat-form-field appearance="outline">
          <mat-label>Compatible Tools</mat-label>
          <mat-select formControlName="compatibleTools" [multiple]="true">
            <mat-option *ngFor="let tool of AVAILABLE_TOOLS" [value]="tool">
              {{ tool }}
            </mat-option>
          </mat-select>
          <mat-hint>Select all AI tools this skill supports</mat-hint>
          @if (f['compatibleTools'].invalid && f['compatibleTools'].touched) {
            <mat-error>Select at least one tool</mat-error>
          }
        </mat-form-field>

        <!-- SKILL.md Content -->
        <mat-form-field appearance="outline">
          <mat-label>SKILL.md Content</mat-label>
          <textarea matInput formControlName="content" rows="10" placeholder="# My Skill&#10;&#10;Instructions for the AI..."></textarea>
          @if (f['content'].invalid && f['content'].touched) {
            <mat-error>Required</mat-error>
          }
        </mat-form-field>
        <div>
          <button type="button" mat-stroked-button (click)="fileInput.click()" style="font-size:12px;">
            <mat-icon style="font-size:16px;">upload_file</mat-icon>
            Upload SKILL.md file
          </button>
          <input #fileInput type="file" accept=".md" style="display:none" (change)="onFileChange($event)" />
        </div>

        @if (serverError()) {
          <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px 16px;color:#dc2626;font-size:13px;">
            {{ serverError() }}
          </div>
        }

        <div style="display:flex;gap:12px;justify-content:flex-end;margin-top:8px;">
          <button mat-stroked-button type="button" routerLink="/">Cancel</button>
          <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || submitting()">
            @if (submitting()) { <mat-spinner diameter="18" style="display:inline-block;margin-right:6px;"></mat-spinner> }
            Publish Skill
          </button>
        </div>
      </form>
    </div>
  `,
})
export class PublishSkillComponent implements OnInit {
  private fb       = inject(FormBuilder);
  private skillSvc = inject(SkillService);
  private router   = inject(Router);
  private snackBar = inject(MatSnackBar);
  private cdr      = inject(ChangeDetectorRef);

  readonly AVAILABLE_TOOLS = ['claude', 'copilot', 'codex', 'opencode'];

  categories  = signal<CategoryModel[]>([]);
  tags        = signal<TagModel[]>([]);
  submitting  = signal(false);
  serverError = signal('');

  form!: FormGroup;

  ngOnInit(): void {
    this.form = this.fb.group({
      name:            ['', [Validators.required, Validators.maxLength(100)]],
      slug:            ['', [Validators.required, Validators.pattern(SLUG_PATTERN)]],
      description:     ['', [Validators.required, Validators.maxLength(1000)]],
      version:         ['1.0.0', [Validators.required, Validators.pattern(SEMVER_PATTERN)]],
      categorySlug:    ['', Validators.required],
      compatibleTools: [['claude'], Validators.required],
      content:         ['', Validators.required],
    });

    this.skillSvc.getCategories().subscribe({
      next: r => {
        this.categories.set(r.categories);
        this.cdr.detectChanges();
      },
      error: () => {},
    });
    this.skillSvc.getTags().subscribe(r => this.tags.set(r.tags));
  }

  get f(): { [key: string]: AbstractControl } { return this.form.controls; }

  onNameInput(): void {
    const raw = this.f['name'].value as string;
    const slug = raw.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    this.f['slug'].setValue(slug, { emitEvent: false });
  }

  onFileChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => this.f['content'].setValue(e.target?.result as string);
    reader.readAsText(file);
  }

  nameError(): string {
    const c = this.f['name'];
    if (c.hasError('required')) return 'Name is required';
    if (c.hasError('maxlength')) return 'Max 100 characters';
    return '';
  }

  slugError(): string {
    const c = this.f['slug'];
    if (c.hasError('required')) return 'Slug is required';
    if (c.hasError('pattern')) return 'Slug 僅允許小寫字母、數字與連字號';
    return '';
  }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.submitting.set(true);
    this.serverError.set('');

    const req = {
      slug:            this.f['slug'].value as string,
      name:            this.f['name'].value as string,
      description:     this.f['description'].value as string,
      version:         this.f['version'].value as string,
      categorySlug:    this.f['categorySlug'].value as string,
      tagSlugs:        [] as string[],
      compatibleTools: this.f['compatibleTools'].value as string[],
      content:         this.f['content'].value as string,
    };

    this.skillSvc.publishSkill(req).subscribe({
      next: res => {
        const msg = res.status === 'PENDING'
          ? '技能已提交，將於 24 小時內完成審核'
          : '技能已發布！';
        this.snackBar.open(msg, '', { duration: 4000 });
        this.router.navigate(['/skills', res.slug]);
      },
      error: err => {
        this.submitting.set(false);
        if (err.status === 409) this.serverError.set('Slug already exists. Please choose a different slug.');
        else if (err.status === 400) this.serverError.set(err.error?.error ?? 'Validation error.');
        else this.serverError.set('Failed to publish. Please try again.');
      },
    });
  }
}
