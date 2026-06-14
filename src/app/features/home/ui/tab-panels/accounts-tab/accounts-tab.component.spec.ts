import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { AccountBalanceItem, TransferDraft } from '../../home-page.models';
import { AccountsTabComponent } from './accounts-tab.component';

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

describe('AccountsTabComponent', () => {
    let fixture: ComponentFixture<AccountsTabComponent>;
    let component: AccountsTabComponent;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [AccountsTabComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(AccountsTabComponent);
        component = fixture.componentInstance;

        fixture.componentRef.setInput('accounts', []);
        fixture.componentRef.setInput('allAccounts', []);
        fixture.componentRef.setInput('transferDraft', transferDraft);
        fixture.componentRef.setInput('currencyOptions', [{ value: 'BYN', label: 'BYN' }]);
        fixture.componentRef.setInput('accountOptions', [
            { value: 'account-id', label: 'Основной счёт' },
            { value: 'second-account', label: 'Резерв' },
        ]);
        fixture.componentRef.setInput('accountFilterOptions', [{ value: '', label: 'Все счета' }]);
        fixture.componentRef.setInput('searchControl', new FormControl('', { nonNullable: true }));
        fixture.componentRef.setInput('selectedAccountId', '');
        fixture.componentRef.setInput('summaryBalanceLabel', '100,00 Br');
        fixture.componentRef.setInput('summaryBalanceValue', 100);
        fixture.componentRef.setInput('newAccountName', '');
        fixture.componentRef.setInput('newAccountCurrency', 'BYN');
        fixture.componentRef.setInput('newAccountNameError', '');
    });

    it('renders account list and transfer panels inside the accounts tab', () => {
        const debtAccount = account({
            id: 'debt-account',
            name: 'Debt account',
            balanceLabel: '-25,00 Br',
            balanceValue: -25,
            isPrimary: false,
        });

        fixture.componentRef.setInput('accounts', [debtAccount]);
        fixture.componentRef.setInput('allAccounts', [debtAccount]);
        fixture.componentRef.setInput('summaryBalanceLabel', '-25,00 Br');
        fixture.componentRef.setInput('summaryBalanceValue', -25);
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
        });
        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;

        expect(host.querySelector('ms-account-list-panel')).not.toBeNull();
        expect(host.querySelector('ms-account-transfer-panel')).not.toBeNull();
        expect(host.textContent ?? '').toContain('Счета и балансы');
        expect(host.textContent ?? '').toContain('-25,00 Br');
        expect(host.textContent ?? '').toContain('К списанию');
    });
});
