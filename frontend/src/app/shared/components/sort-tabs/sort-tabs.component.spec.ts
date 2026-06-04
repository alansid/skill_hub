import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { SortTabsComponent } from './sort-tabs.component';

describe('SortTabsComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SortTabsComponent],
      providers: [provideAnimationsAsync()],
    }).compileComponents();
  });

  it('defaults to trending (index 0)', () => {
    const fixture = TestBed.createComponent(SortTabsComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.selectedIndex).toBe(0);
  });

  it('sets correct index when value input is "latest"', () => {
    const fixture = TestBed.createComponent(SortTabsComponent);
    fixture.componentRef.setInput('value', 'latest');
    fixture.detectChanges();
    expect(fixture.componentInstance.selectedIndex).toBe(1);
  });

  it('sets correct index when value input is "top"', () => {
    const fixture = TestBed.createComponent(SortTabsComponent);
    fixture.componentRef.setInput('value', 'top');
    fixture.detectChanges();
    expect(fixture.componentInstance.selectedIndex).toBe(2);
  });

  it('emits correct value on tab change', () => {
    const fixture = TestBed.createComponent(SortTabsComponent);
    fixture.detectChanges();
    const emitted: string[] = [];
    fixture.componentInstance.valueChange.subscribe((v: string) => emitted.push(v));

    fixture.componentInstance.onTabChange(1);

    expect(emitted).toEqual(['latest']);
  });
});
