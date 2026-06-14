import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AccountBalanceItem, TransferDraft } from '../../home-page.models';
import { AccountTransferPanelComponent } from './account-transfer-panel.component';

function account(overrides: Partial<AccountBalanceItem>): AccountBalanceItem {
    return {
        id: 'account-id',
        name: 'Основной счёт',
        currencyCode: 'BYN',
        currencyLabel: 'Белорусский рубль',
        balanceLabel: '100,00 Br',
        balanceValue: 100,
        monthChangeLabel: '+0,00 Br',
        monthChangeValue: 0,
        color: '#23c78b',
        isPrimary: true,
        ...overrides,
    };
}

const transferDraft: TransferDraft = {
    fromAccountId: 'account-id',
    toAccountId: 'second-account',
    amount: 0,
    rate: null,
    description: '',
};

describe('AccountTransferPanelComponent', () => {
    let fixture: ComponentFixture<AccountTransferPanelComponent>;
    let component: AccountTransferPanelComponent;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [AccountTransferPanelComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(AccountTransferPanelComponent);
        component = fixture.componentInstance;

        fixture.componentRef.setInput('allAccounts', []);
        fixture.componentRef.setInput('transferDraft', transferDraft);
        fixture.componentRef.setInput('accountOptions', [
            { value: 'account-id', label: 'Основной счёт' },
            { value: 'second-account', label: 'Резерв' },
        ]);
        fixture.componentRef.setInput('transferRateError', '');
        fixture.componentRef.setInput('rateLoading', false);
        fixture.componentRef.setInput('saving', false);
    });

    it('keeps transfer amount text while editing and formats it only after blur', () => {
        const draftSpy = vi.fn();
        component.transferDraftChange.subscribe(draftSpy);
        fixture.detectChanges();

        component.onTransferAmountFocus();
        component.onTransferAmountInput('25,');

        expect(component.transferAmountText()).toBe('25,');
        expect(draftSpy).toHaveBeenLastCalledWith({
            ...transferDraft,
            amount: 25,
        });

        component.onTransferAmountInput('25,7');

        expect(component.transferAmountText()).toBe('25,7');
        expect(draftSpy).toHaveBeenLastCalledWith({
            ...transferDraft,
            amount: 25.7,
        });

        component.onTransferAmountBlur();

        expect(component.transferAmountText()).toBe('25.70');
    });

    it('removes the initial zero mask when transfer typing starts before the input visually clears', () => {
        const draftSpy = vi.fn();
        component.transferDraftChange.subscribe(draftSpy);
        fixture.detectChanges();

        component.onTransferAmountFocus();
        component.onTransferAmountInput('0.0012,5');

        expect(component.transferAmountText()).toBe('12,5');
        expect(draftSpy).toHaveBeenLastCalledWith({
            ...transferDraft,
            amount: 12.5,
        });
    });

    it('shows an inverted bank rate while keeping the backend rate in the draft', () => {
        const draftSpy = vi.fn();
        component.transferDraftChange.subscribe(draftSpy);
        fixture.componentRef.setInput('allAccounts', [
            account({ id: 'account-id', name: 'BYN account', currencyCode: 'BYN' }),
            account({
                id: 'second-account',
                name: 'USD account',
                currencyCode: 'USD',
                currencyLabel: 'Доллар США',
                balanceLabel: '100,00 $',
                color: '#67a6c1',
                isPrimary: false,
            }),
        ]);
        fixture.componentRef.setInput('transferDraft', {
            ...transferDraft,
            rate: 0.37,
        });
        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;
        const rateLabel = host.querySelector('.transfer-rate__label');

        expect(rateLabel?.textContent).toContain('USD → BYN');
        expect(component.displayTransferRate()).toBe('2,703');
        expect(component.bankRateHint()).toBe('1 USD = 2,703 BYN');

        component.onTransferRateInput('2.5');

        expect(draftSpy).toHaveBeenLastCalledWith({
            ...transferDraft,
            rate: 0.4,
        });
    });

    it('renders transfer as a clear withdraw to deposit flow when the rate is visible', () => {
        fixture.componentRef.setInput('allAccounts', [
            account({ id: 'account-id', name: 'BYN account', currencyCode: 'BYN' }),
            account({
                id: 'second-account',
                name: 'USD account',
                currencyCode: 'USD',
                currencyLabel: 'US dollar',
                balanceLabel: '100,00 $',
                color: '#67a6c1',
                isPrimary: false,
            }),
        ]);
        fixture.componentRef.setInput('transferDraft', {
            ...transferDraft,
            amount: 100,
            rate: 0.37,
        });

        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;

        expect(host.querySelector('.transfer-grid')).toBeNull();
        expect(host.querySelector('.transfer-flow')).not.toBeNull();
        expect(host.querySelector('.transfer-panel--from')).not.toBeNull();
        expect(host.querySelector('.transfer-panel--to')).not.toBeNull();
        expect(host.querySelector('.transfer-direction')).not.toBeNull();
        expect(host.querySelector('.transfer-conversion-card')).not.toBeNull();
        expect(host.querySelector('.transfer-description.transfer-field')).not.toBeNull();
        expect(host.querySelector('.transfer-amount-card--withdraw')).not.toBeNull();
        expect(host.querySelector('.transfer-amount-card--deposit')).not.toBeNull();
        expect(
            getComputedStyle(host.querySelector<HTMLElement>('.transfer-conversion-card')!)
                .alignItems,
        ).toBe('center');
        expect(host.textContent ?? '').toContain('К списанию');
        expect(host.textContent ?? '').toContain('К зачислению');
        expect(host.textContent ?? '').toContain('Будет списано');
        expect(host.textContent ?? '').toContain('Будет зачислено');
        expect(component.transferReceiveAmountLabel()).toBe('37.00 USD');
    });

    it('recalculates the withdrawal amount when the deposit amount is typed', () => {
        const draftSpy = vi.fn();
        component.transferDraftChange.subscribe(draftSpy);
        fixture.componentRef.setInput('allAccounts', [
            account({ id: 'account-id', name: 'BYN account', currencyCode: 'BYN' }),
            account({
                id: 'second-account',
                name: 'USD account',
                currencyCode: 'USD',
                currencyLabel: 'US dollar',
                balanceLabel: '100,00 $',
                color: '#67a6c1',
                isPrimary: false,
            }),
        ]);
        fixture.componentRef.setInput('transferDraft', {
            ...transferDraft,
            amount: 100,
            rate: 0.37,
        });
        fixture.detectChanges();

        component.onTransferReceiveAmountFocus();
        component.onTransferReceiveAmountInput('50');

        expect(component.transferReceiveAmountText()).toBe('50');
        expect(draftSpy).toHaveBeenLastCalledWith({
            ...transferDraft,
            amount: 135.14,
            rate: 0.37,
        });
    });

    it('requires a positive rate before submitting a transfer between different currencies', () => {
        fixture.componentRef.setInput('allAccounts', [
            account({ id: 'account-id', name: 'BYN account', currencyCode: 'BYN' }),
            account({
                id: 'second-account',
                name: 'USD account',
                currencyCode: 'USD',
                currencyLabel: 'US dollar',
                balanceLabel: '100,00 $',
                color: '#67a6c1',
                isPrimary: false,
            }),
        ]);
        fixture.componentRef.setInput('transferDraft', {
            ...transferDraft,
            amount: 100,
            rate: null,
        });
        fixture.detectChanges();

        expect(component.canSubmitTransfer()).toBe(false);
    });

    it('requires a positive amount before submitting a transfer', () => {
        fixture.componentRef.setInput('allAccounts', [
            account({ id: 'account-id', name: 'Main account', currencyCode: 'BYN' }),
            account({
                id: 'second-account',
                name: 'Reserve account',
                currencyCode: 'BYN',
                currencyLabel: 'Belarusian ruble',
                balanceLabel: '100,00 Br',
                color: '#67a6c1',
                isPrimary: false,
            }),
        ]);
        fixture.componentRef.setInput('transferDraft', {
            ...transferDraft,
            amount: -100,
            rate: null,
        });
        fixture.detectChanges();

        expect(component.canSubmitTransfer()).toBe(false);
    });

    it('blocks transfer submit while a different-currency rate is loading', () => {
        fixture.componentRef.setInput('allAccounts', [
            account({ id: 'account-id', name: 'BYN account', currencyCode: 'BYN' }),
            account({
                id: 'second-account',
                name: 'USD account',
                currencyCode: 'USD',
                currencyLabel: 'US dollar',
                balanceLabel: '100,00 $',
                color: '#67a6c1',
                isPrimary: false,
            }),
        ]);
        fixture.componentRef.setInput('transferDraft', {
            ...transferDraft,
            amount: 100,
            rate: 3.25,
        });
        fixture.componentRef.setInput('rateLoading', true);
        fixture.detectChanges();

        expect(component.canSubmitTransfer()).toBe(false);
    });
});
