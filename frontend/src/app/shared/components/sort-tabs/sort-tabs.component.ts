import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';

type SortValue = 'trending' | 'latest' | 'top';

const TABS: { value: SortValue; label: string }[] = [
  { value: 'trending', label: '🔥 熱門' },
  { value: 'latest',   label: '🆕 最新' },
  { value: 'top',      label: '⭐ 最高評分' },
];

@Component({
  selector: 'app-sort-tabs',
  standalone: true,
  imports: [MatTabsModule],
  template: `
    <mat-tab-group
      [selectedIndex]="selectedIndex"
      (selectedIndexChange)="onTabChange($event)"
      animationDuration="200ms">
      @for (tab of tabs; track tab.value) {
        <mat-tab [label]="tab.label" />
      }
    </mat-tab-group>
  `,
})
export class SortTabsComponent {
  readonly tabs = TABS;

  @Input()
  set value(v: SortValue) {
    this.selectedIndex = TABS.findIndex(t => t.value === v);
  }

  @Output() valueChange = new EventEmitter<SortValue>();

  selectedIndex = 0;

  onTabChange(index: number): void {
    this.valueChange.emit(TABS[index].value);
  }
}
