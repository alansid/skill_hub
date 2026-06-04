import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { SearchBarComponent } from './search-bar.component';

describe('SearchBarComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchBarComponent],
      providers: [provideAnimationsAsync()],
    }).compileComponents();
  });

  it('emits search event with trimmed value on submit', () => {
    const fixture = TestBed.createComponent(SearchBarComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const emitted: string[] = [];
    component.search.subscribe((v: string) => emitted.push(v));

    component.query = '  TDD  ';
    const form = fixture.debugElement.query(By.css('form'));
    form.triggerEventHandler('ngSubmit', null);

    expect(emitted).toEqual(['TDD']);
  });

  it('emits empty string when query is blank', () => {
    const fixture = TestBed.createComponent(SearchBarComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const emitted: string[] = [];
    component.search.subscribe((v: string) => emitted.push(v));

    component.query = '   ';
    const form = fixture.debugElement.query(By.css('form'));
    form.triggerEventHandler('ngSubmit', null);

    expect(emitted).toEqual(['']);
  });
});
