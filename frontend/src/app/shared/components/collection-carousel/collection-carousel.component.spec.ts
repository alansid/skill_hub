import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { CollectionCarouselComponent } from './collection-carousel.component';
import { CollectionWithSkills } from '../../models/skill.model';

const MOCK_COLLECTIONS: CollectionWithSkills[] = [
  {
    id: 'col1',
    name: 'Best Practices',
    description: 'A collection of best practice skills.',
    skills: [
      {
        id: 's1', slug: 'tdd', name: 'TDD Starter', description: 'TDD skill',
        category: { id: 'c1', name: 'Testing', slug: 'testing' }, tags: [],
        author: 'skillhub', version: '1.0.0', installCount: 500,
        compatibleTools: ['claude'], createdAt: '2026-01-01T00:00:00',
      },
      {
        id: 's2', slug: 'code-review', name: 'Code Review', description: 'Code review skill',
        category: { id: 'c1', name: 'Testing', slug: 'testing' }, tags: [],
        author: 'skillhub', version: '1.0.0', installCount: 300,
        compatibleTools: ['claude'], createdAt: '2026-01-01T00:00:00',
      },
    ],
  },
  {
    id: 'col2',
    name: 'Frontend Skills',
    description: 'Angular, React, and more.',
    skills: [],
  },
];

describe('CollectionCarouselComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CollectionCarouselComponent],
      providers: [provideRouter([]), provideAnimationsAsync()],
    }).compileComponents();
  });

  it('renders a card for each collection', () => {
    const fixture = TestBed.createComponent(CollectionCarouselComponent);
    fixture.componentRef.setInput('collections', MOCK_COLLECTIONS);
    fixture.detectChanges();
    const cards = fixture.debugElement.queryAll(By.css('mat-card'));
    expect(cards.length).toBe(2);
  });

  it('renders collection name and description', () => {
    const fixture = TestBed.createComponent(CollectionCarouselComponent);
    fixture.componentRef.setInput('collections', MOCK_COLLECTIONS);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Best Practices');
    expect(text).toContain('A collection of best practice skills.');
  });

  it('shows skill count badge', () => {
    const fixture = TestBed.createComponent(CollectionCarouselComponent);
    fixture.componentRef.setInput('collections', MOCK_COLLECTIONS);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('2 個技能');
  });

  it('shows first two skill pills', () => {
    const fixture = TestBed.createComponent(CollectionCarouselComponent);
    fixture.componentRef.setInput('collections', MOCK_COLLECTIONS);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('TDD Starter');
    expect(text).toContain('Code Review');
  });

  it('renders empty collection without errors', () => {
    const fixture = TestBed.createComponent(CollectionCarouselComponent);
    fixture.componentRef.setInput('collections', [MOCK_COLLECTIONS[1]]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Frontend Skills');
  });
});
