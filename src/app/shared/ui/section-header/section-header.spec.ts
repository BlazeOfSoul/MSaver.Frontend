import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SectionHeader } from './section-header';

@Component({
    standalone: true,
    imports: [SectionHeader],
    template: `
        <ms-section-header eyebrow="Раздел" title="Заголовок" description="Описание">
            <button type="button">Действие</button>
        </ms-section-header>
    `,
})
class SectionHeaderHostComponent {}

describe('SectionHeader', () => {
    let fixture: ComponentFixture<SectionHeaderHostComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [SectionHeaderHostComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(SectionHeaderHostComponent);
        fixture.detectChanges();
    });

    it('renders title content and projected actions', () => {
        const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

        expect(text).toContain('Раздел');
        expect(text).toContain('Заголовок');
        expect(text).toContain('Описание');
        expect(text).toContain('Действие');
    });
});
