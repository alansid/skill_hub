import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [FormsModule],
  styles: [`
    .search-wrap {
      display: flex;
      align-items: center;
      background: rgba(255,255,255,0.18);
      border: 1px solid rgba(255,255,255,0.3);
      border-radius: 8px;
      height: 38px;
      padding: 0 12px;
      gap: 8px;
      width: 100%;
      box-sizing: border-box;
      transition: background .15s;
    }
    .search-wrap:focus-within {
      background: rgba(255,255,255,0.28);
      border-color: rgba(255,255,255,0.55);
    }
    .search-icon { font-size: 16px; opacity: 0.7; flex-shrink: 0; }
    .search-input {
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      color: #fff;
      font-size: 13px;
      min-width: 0;
    }
    .search-input::placeholder { color: rgba(255,255,255,0.65); }
  `],
  template: `
    <form (ngSubmit)="onSubmit()" style="width:100%">
      <div class="search-wrap">
        <span class="search-icon">🔍</span>
        <input class="search-input" [(ngModel)]="query" name="q"
               placeholder="搜尋技能名稱、標籤…" autocomplete="off" />
      </div>
    </form>
  `,
})
export class SearchBarComponent {
  @Output() search = new EventEmitter<string>();
  query = '';

  onSubmit(): void {
    this.search.emit(this.query.trim());
  }
}
