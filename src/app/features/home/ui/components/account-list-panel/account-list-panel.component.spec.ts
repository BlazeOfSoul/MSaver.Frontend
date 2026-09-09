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
        fixture.componentRef.setInput('newAccountInitialBalance', 0);
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

    it('keeps the create account action in the panel header', () => {
        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;
        const header = host.querySelector<HTMLElement>('.panel__header');
        const createButton = header?.querySelector<HTMLElement>(
            ':scope > ms-button[data-testid="open-account-dialog"]',
        );

        expect(createButton).not.toBeNull();
    });

    it('keeps account name errors inside the account name field stack', () => {
        fixture.componentRef.setInput('newAccountNameError', 'Name already exists');
        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;

        host.querySelector<HTMLButtonElement>('[data-testid="open-account-dialog"]')?.click();
        fixture.detectChanges();

        const fieldStack = host.querySelector('.account-dialog__field-stack');

        expect(fieldStack).not.toBeNull();
        expect(fieldStack?.querySelector('.field-error')?.textContent).toContain(
            'Name already exists',
        );
        expect(host.querySelector('.account-dialog__fields > .field-error')).toBeNull();
    });

    it('opens account creation in a modal and submits name, currency and initial balance', () => {
        const nameSpy = vi.fn();
        const currencySpy = vi.fn();
        const initialBalanceSpy = vi.fn();
        const createSpy = vi.fn();
        fixture.componentInstance.newAccountNameChange.subscribe(nameSpy);
        fixture.componentInstance.newAccountCurrencyChange.subscribe(currencySpy);
        fixture.componentInstance.newAccountInitialBalanceChange.subscribe(initialBalanceSpy);
        fixture.componentInstance.createAccount.subscribe(createSpy);
        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;

        expect(host.querySelector('.account-dialog')).toBeNull();

        host.querySelector<HTMLButtonElement>('[data-testid="open-account-dialog"]')?.click();
        fixture.detectChanges();

        const dialog = host.querySelector<HTMLElement>('.account-dialog');
        const inputs = Array.from(host.querySelectorAll<HTMLInputElement>('.account-dialog input'));

        expect(dialog).not.toBeNull();
        expect(host.querySelector('.account-create')).toBeNull();

        inputs[0].value = 'Savings';
        inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
        inputs[1].value = '1250,50';
        inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
        fixture.detectChanges();

        host.querySelector<HTMLButtonElement>('[data-testid="submit-account-dialog"]')?.click();

        expect(nameSpy).toHaveBeenCalledWith('Savings');
        expect(initialBalanceSpy).toHaveBeenCalledWith(1250.5);
        expect(createSpy).toHaveBeenCalledOnce();
        expect(currencySpy).not.toHaveBeenCalled();
    });

    it('saves a chosen account color while preserving its name', () => {
        const selected = account({ id: 'reserve', name: 'Reserve', color: '#123456' });
        fixture.componentRef.setInput('accounts', [selected]);
        fixture.componentRef.setInput('allAccounts', [selected]);
        const save = vi.fn();
        fixture.componentInstance.renameAccount.subscribe(save);
        fixture.detectChanges();
        const host = fixture.nativeElement as HTMLElement;
        host.querySelector<HTMLButtonElement>('[data-testid="rename-account"]')!.click();
        fixture.detectChanges();
        const picker = host.querySelector<HTMLInputElement>(
            '[data-testid="account-color-picker"]',
        )!;
        expect(picker.type).toBe('color');
        picker.value = '#5896ed';
        picker.dispatchEvent(new Event('input', { bubbles: true }));
        fixture.detectChanges();
        host.querySelector<HTMLButtonElement>('[data-testid="submit-account-rename"]')!.click();
        expect(save).toHaveBeenCalledWith({
            accountId: 'reserve',
            name: 'Reserve',
            color: '#5896ed',
        });
    });

    it('requires confirmation for the named account and focuses cancellation first', async () => {
        const secondary = account({ id: 'home', name: 'Дома', isPrimary: false });
        fixture.componentRef.setInput('accounts', [secondary]);
        fixture.componentRef.setInput('allAccounts', [secondary]);
        const deleted = vi.fn();
        fixture.componentInstance.deleteAccount.subscribe(deleted);
        fixture.detectChanges();
        const host = fixture.nativeElement as HTMLElement;

        host.querySelector<HTMLElement>('[data-testid="delete-account"]')!.click();
        fixture.detectChanges();
        await fixture.whenStable();
        expect(host.querySelector('[role="dialog"]')?.textContent).toContain(
            'Удалить счёт «Дома»?',
        );
        expect(deleted).not.toHaveBeenCalled();
        const cancel = host.querySelector<HTMLElement>('[data-testid="cancel-delete-account"]')!;
        expect(document.activeElement).toBe(cancel);
        cancel.click();
        fixture.detectChanges();
        expect(host.querySelector('[role="dialog"]')).toBeNull();
        expect(deleted).not.toHaveBeenCalled();

        host.querySelector<HTMLElement>('[data-testid="delete-account"]')!.click();
        fixture.detectChanges();
        const confirm = host.querySelector<HTMLElement>('[data-testid="confirm-delete-account"]')!;
        confirm.click();
        confirm.click();
        fixture.detectChanges();
        expect(deleted).toHaveBeenCalledExactlyOnceWith('home');
        expect(host.querySelector('[role="dialog"]')).toBeNull();
    });

    it.each(['escape', 'backdrop'])('cancels account deletion with %s', (action) => {
        const secondary = account({ id: 'home', isPrimary: false });
        fixture.componentRef.setInput('accounts', [secondary]);
        fixture.componentRef.setInput('allAccounts', [secondary]);
        const deleted = vi.fn();
        fixture.componentInstance.deleteAccount.subscribe(deleted);
        fixture.detectChanges();
        const host = fixture.nativeElement as HTMLElement;
        host.querySelector<HTMLElement>('[data-testid="delete-account"]')!.click();
        fixture.detectChanges();
        const backdrop = host.querySelector<HTMLElement>('.ms-modal-backdrop')!;
        if (action === 'escape') {
            backdrop.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        } else {
            backdrop.dispatchEvent(new Event('pointerdown', { bubbles: true }));
            backdrop.click();
        }
        fixture.detectChanges();
        expect(host.querySelector('[role="dialog"]')).toBeNull();
        expect(deleted).not.toHaveBeenCalled();
    });

    it.each(['missing', 'primary'])(
        'does not delete an account that became %s while confirming',
        (state) => {
            const secondary = account({ id: 'home', isPrimary: false });
            fixture.componentRef.setInput('accounts', [secondary]);
            fixture.componentRef.setInput('allAccounts', [secondary]);
            const deleted = vi.fn();
            fixture.componentInstance.deleteAccount.subscribe(deleted);
            fixture.detectChanges();
            const host = fixture.nativeElement as HTMLElement;
            host.querySelector<HTMLElement>('[data-testid="delete-account"]')!.click();
            fixture.detectChanges();
            fixture.componentRef.setInput(
                'allAccounts',
                state === 'missing' ? [] : [{ ...secondary, isPrimary: true }],
            );
            fixture.detectChanges();
            host.querySelector<HTMLElement>('[data-testid="confirm-delete-account"]')!.click();
            expect(deleted).not.toHaveBeenCalled();
        },
    );

    it('does not confirm account deletion while a mutation is pending', () => {
        const secondary = account({ id: 'home', isPrimary: false });
        fixture.componentRef.setInput('accounts', [secondary]);
        fixture.componentRef.setInput('allAccounts', [secondary]);
        const deleted = vi.fn();
        fixture.componentInstance.deleteAccount.subscribe(deleted);
        fixture.detectChanges();
        fixture.componentInstance.openDeleteDialog(secondary);
        fixture.componentRef.setInput('saving', true);
        fixture.detectChanges();
        fixture.componentInstance.confirmDeleteAccount();
        expect(deleted).not.toHaveBeenCalled();
    });

    it('allows every account to be renamed from the account list', () => {
        const renameSpy = vi.fn();
        const primary = account({ id: 'primary-account', name: 'Main', isPrimary: true });
        const secondary = account({ id: 'secondary-account', name: 'Cash', isPrimary: false });
        fixture.componentRef.setInput('accounts', [primary, secondary]);
        fixture.componentRef.setInput('allAccounts', [primary, secondary]);
        fixture.componentInstance.renameAccount.subscribe(renameSpy);
        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;
        const editButtons = host.querySelectorAll<HTMLButtonElement>(
            '[data-testid="rename-account"]',
        );

        expect(editButtons).toHaveLength(2);

        editButtons[1].click();
        fixture.detectChanges();

        const input = host.querySelector<HTMLInputElement>(
            'ms-name-color-dialog input[type="text"]',
        );
        input!.value = 'Family wallet';
        input!.dispatchEvent(new Event('input', { bubbles: true }));
        fixture.detectChanges();

        host.querySelector<HTMLButtonElement>('[data-testid="submit-account-rename"]')?.click();

        expect(renameSpy).toHaveBeenCalledWith({
            accountId: 'secondary-account',
            name: 'Family wallet',
            color: secondary.color,
        });
    });
});
