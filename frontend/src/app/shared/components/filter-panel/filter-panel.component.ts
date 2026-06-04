import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatChipsModule } from '@angular/material/chips';
import { CategoryModel, TagModel } from '../../models/skill.model';

@Component({
  selector: 'app-filter-panel',
  standalone: true,
  imports: [CommonModule, MatChipsModule],
  styles: [`
    .section-label {
      font-size: 10px; font-weight: 700; letter-spacing: .08em;
      text-transform: uppercase; color: var(--brand-muted);
      display: flex; align-items: center; gap: 6px; margin-bottom: 6px;
    }
    .section-label::before {
      content: ''; display: inline-block; width: 3px; height: 14px;
      background: linear-gradient(to bottom, var(--brand-primary), var(--brand-accent));
      border-radius: 2px;
    }
    .section-divider {
      border: none; border-top: 1px solid var(--brand-border); margin: 12px 0;
    }
    .cat-item {
      display: flex; align-items: center;
      padding: 7px 10px; border-radius: 8px;
      font-size: 13px; color: var(--brand-text);
      cursor: pointer; transition: background .12s ease;
      user-select: none;
    }
    .cat-item:hover { background: #eef2ff; }
    .cat-item.active {
      background: #eef2ff;
      color: var(--brand-primary);
      font-weight: 600;
    }
  `],
  template: `
    <div class="flex flex-col gap-1">
      <div>
        <p class="section-label">分類</p>
        <ul class="m-0 p-0 list-none flex flex-col gap-0.5">
          <li class="cat-item" [class.active]="selectedCategory === null"
              (click)="onCategoryChange(null)">全部</li>
          @for (cat of categories; track cat.id) {
            <li class="cat-item" [class.active]="selectedCategory === cat.slug"
                (click)="onCategoryChange(cat.slug)">{{ cat.name }}</li>
          }
        </ul>
      </div>

      <hr class="section-divider">

      <div>
        <p class="section-label">標籤</p>
        <mat-chip-listbox multiple [value]="selectedTags" (change)="onTagChange($event.value)">
          @for (tag of tags; track tag.id) {
            <mat-chip-option [value]="tag.name">{{ tag.name }}</mat-chip-option>
          }
        </mat-chip-listbox>
      </div>
    </div>
  `,
})
export class FilterPanelComponent {
  @Input() categories: CategoryModel[] = [];
  @Input() tags: TagModel[] = [];
  @Input() selectedCategory: string | null = null;
  @Input() selectedTags: string[] = [];

  @Output() categoryChange = new EventEmitter<string | null>();
  @Output() tagChange = new EventEmitter<string[]>();

  onCategoryChange(value: string | null): void {
    this.categoryChange.emit(value || null);
  }

  onTagChange(value: string[]): void {
    this.tagChange.emit(value ?? []);
  }
}
