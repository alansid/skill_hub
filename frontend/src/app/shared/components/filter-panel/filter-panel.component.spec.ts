import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { FilterPanelComponent } from './filter-panel.component';

const CATEGORIES = [
  { id: 'c1', name: 'Frontend', slug: 'frontend' },
  { id: 'c2', name: 'Testing', slug: 'testing' },
];

const TAGS = [
  { id: 't1', name: 'TypeScript', type: 'LANGUAGE' },
  { id: 't2', name: 'TDD', type: 'PROBLEM_SPACE' },
];

describe('FilterPanelComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FilterPanelComponent],
      providers: [provideAnimationsAsync()],
    }).compileComponents();
  });

  it('renders all categories including "全部"', () => {
    const fixture = TestBed.createComponent(FilterPanelComponent);
    fixture.componentRef.setInput('categories', CATEGORIES);
    fixture.componentRef.setInput('tags', TAGS);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('全部');
    expect(text).toContain('Frontend');
    expect(text).toContain('Testing');
  });

  it('renders all tags', () => {
    const fixture = TestBed.createComponent(FilterPanelComponent);
    fixture.componentRef.setInput('categories', CATEGORIES);
    fixture.componentRef.setInput('tags', TAGS);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('TypeScript');
    expect(text).toContain('TDD');
  });

  it('emits null on "全部" category click', () => {
    const fixture = TestBed.createComponent(FilterPanelComponent);
    fixture.componentRef.setInput('categories', CATEGORIES);
    fixture.componentRef.setInput('tags', TAGS);
    fixture.detectChanges();

    const emitted: (string | null)[] = [];
    fixture.componentInstance.categoryChange.subscribe(v => emitted.push(v));

    const items = fixture.debugElement.queryAll(By.css('.cat-item'));
    items[0].triggerEventHandler('click', null);
    expect(emitted).toEqual([null]);
  });

  it('emits category slug on category item click', () => {
    const fixture = TestBed.createComponent(FilterPanelComponent);
    fixture.componentRef.setInput('categories', CATEGORIES);
    fixture.componentRef.setInput('tags', TAGS);
    fixture.detectChanges();

    const emitted: (string | null)[] = [];
    fixture.componentInstance.categoryChange.subscribe(v => emitted.push(v));

    const items = fixture.debugElement.queryAll(By.css('.cat-item'));
    items[1].triggerEventHandler('click', null);
    expect(emitted).toEqual(['frontend']);
  });

  it('active class is on "全部" when selectedCategory is null', () => {
    const fixture = TestBed.createComponent(FilterPanelComponent);
    fixture.componentRef.setInput('categories', CATEGORIES);
    fixture.componentRef.setInput('tags', TAGS);
    fixture.componentRef.setInput('selectedCategory', null);
    fixture.detectChanges();

    const allItem = fixture.debugElement.queryAll(By.css('.cat-item'))[0];
    expect(allItem.classes['active']).toBe(true);
  });
});
