import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { AccountBalanceItem } from '../../home-page.models';
import { AccountListPanelComponent } from './account-list-panel.component';

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

describe('AccountListPanelComponent', () => {
    let fixture: ComponentFixture<AccountListPanelComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [AccountListPanelComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(AccountListPanelComponent);

        fixture.componentRef.setInput('accounts', []);
        fixture.componentRef.setInput('allAccounts', []);
        fixture.componentRef.setInput('currencyOptions', [{ value: 'BYN', label: 'BYN' }]);
        fixture.componentRef.setInput('accountFilterOptions', [{ value: '', label: 'Все счета' }]);
        fixture.componentRef.setInput('searchControl', new FormControl('', { nonNullable: true }));
        fixture.componentRef.setInput('selectedAccountId', '');
        fixture.componentRef.setInput('summaryBalanceLabel', '100,00 Br');
        fixture.componentRef.setInput('summaryBalanceValue', 100);
        fixture.componentRef.setInput('newAccountName', '');
        fixture.componentRef.setInput('newAccountCurrency', 'BYN');
        fixture.componentRef.setInput('newAccountNameError', '');
        fixture.componentRef.setInput('saving', false);
    });

    it('renders the account summary and marks negative balances', () => {
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
        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;
        const summaryValue = host.querySelector('.accounts-summary__value');
        const accountBalance = host.querySelector('.account-card__balance');

        expect(host.textContent ?? '').toContain('Сводный баланс');
        expect(summaryValue?.textContent).toContain('-25,00 Br');
        expect(summaryValue?.classList.contains('accounts-summary__value--negative')).toBe(true);
        expect(accountBalance?.classList.contains('account-card__balance--negative')).toBe(true);
    });

    it('uses different empty messages for no accounts and no filtered results', () => {
        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;

        expect(host.textContent ?? '').toContain('Пока нет счетов');

        fixture.componentRef.setInput('allAccounts', [account({ id: 'hidden-account' })]);
        fixture.detectChanges();

        expect(host.textContent ?? '').toContain('Ничего не найдено');
        expect(host.textContent ?? '').not.toContain('Пока нет счетов');
    });

    it('keeps account name errors inside the account name field stack', () => {
        fixture.componentRef.setInput('newAccountNameError', 'Name already exists');
        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;
        const fieldStack = host.querySelector('.account-create__field-stack');

        expect(fieldStack).not.toBeNull();
        expect(fieldStack?.querySelector('.field-error')?.textContent).toContain(
            'Name already exists',
        );
        expect(host.querySelector('.account-create__fields > .field-error')).toBeNull();
    });
});
