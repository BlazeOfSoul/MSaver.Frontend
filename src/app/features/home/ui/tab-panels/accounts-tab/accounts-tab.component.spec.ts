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
        fixture.componentRef.setInput('newAccountInitialBalance', 0);
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

    it('shows one balance series per currency and explains transfers separately from the peak', () => {
        fixture.componentRef.setInput('accounts', [
            account({ id: 'main', balanceValue: 650 }),
            account({ id: 'reserve', name: 'Резерв', balanceValue: 1800 }),
            account({ id: 'usd', currencyCode: 'USD', balanceValue: 50 }),
        ]);
        fixture.componentRef.setInput('monthLabel', 'октябрь 2026 г.');
        fixture.componentRef.setInput(
            'monthActivity',
            new Map([
                [
                    'main',
                    {
                        opening: 500,
                        incoming: 2400,
                        outgoing: 2250,
                        transferIn: 0,
                        transferOut: 1800,
                        closing: 650,
                        maximum: 2900,
                    },
                ],
            ]),
        );
        fixture.detectChanges();
        expect(component.balanceCharts()).toHaveLength(2);
        expect(component.balanceCharts()[0].datasets).toHaveLength(1);
        expect(component.balanceCharts()[0].datasets[0].data).toEqual([1800, 650]);
        expect(component.balanceCharts()[1].datasets[0].data).toEqual([50]);
        const text = fixture.nativeElement.textContent.replaceAll('\u00a0', ' ');
        expect(text).toContain('Максимальный остаток');
        expect(text).toContain('2 900,00 Br');
        expect(text).toContain('Из них переводы: 1 800,00 Br');
    });

    it('switches the displayed currency without mixing balances and falls back when filtered out', () => {
        const byn = account({ id: 'byn', balanceValue: 650, monthChangeValue: -50 });
        const usd = account({
            id: 'usd',
            currencyCode: 'USD',
            balanceValue: 20,
            monthChangeValue: 5,
        });
        fixture.componentRef.setInput('accounts', [byn, usd]);
        fixture.detectChanges();
        const host = fixture.nativeElement as HTMLElement;
        expect(host.querySelectorAll('ms-chart-card')).toHaveLength(1);
        expect(component.selectedBalanceChart()?.balance).toBe(650);

        const buttons = host.querySelectorAll<HTMLButtonElement>('.account-currencies button');
        buttons[1].click();
        fixture.detectChanges();
        expect(buttons[1].getAttribute('aria-pressed')).toBe('true');
        expect(component.selectedBalanceChart()?.currency).toBe('USD');
        expect(component.selectedBalanceChart()?.balance).toBe(20);
        expect(component.selectedBalanceChart()?.change).toBe(5);

        fixture.componentRef.setInput('accounts', [byn]);
        fixture.detectChanges();
        expect(component.selectedBalanceChart()?.currency).toBe('BYN');
        expect(component.selectedBalanceChart()?.change).toBe(-50);
        expect(host.querySelector('.account-currencies')).toBeNull();

        fixture.componentRef.setInput('accounts', []);
        fixture.detectChanges();
        expect(host.querySelector('.account-overview')).toBeNull();
    });

    it('uses a searchable selector for six currencies and preserves selection when returning to buttons', () => {
        const currencies = [
            ['BYN', 'Белорусский рубль'],
            ['USD', 'Доллар США'],
            ['EUR', 'Евро'],
            ['RUB', 'Российский рубль'],
            ['PLN', 'Польский злотый'],
            ['CNY', 'Китайский юань'],
        ];
        const accounts = currencies.map(([currencyCode, currencyLabel], index) =>
            account({ id: currencyCode, currencyCode, currencyLabel, balanceValue: index + 1 }),
        );
        fixture.componentRef.setInput('accounts', accounts);
        fixture.detectChanges();
        const host = fixture.nativeElement as HTMLElement;
        expect(host.querySelector('.account-currencies')).toBeNull();
        host.querySelector<HTMLButtonElement>(
            '.account-currency-select [role="combobox"]',
        )!.click();
        fixture.detectChanges();
        const search = host.querySelector<HTMLInputElement>('.account-currency-select input')!;
        search.value = 'евро';
        search.dispatchEvent(new Event('input'));
        fixture.detectChanges();
        const options = host.querySelectorAll<HTMLButtonElement>(
            '.account-currency-select [role="option"]',
        );
        expect(options).toHaveLength(1);
        expect(options[0].textContent).toContain('EUR');
        options[0].click();
        fixture.detectChanges();
        expect(component.selectedBalanceChart()?.currency).toBe('EUR');
        expect(component.selectedBalanceChart()?.balance).toBe(3);

        fixture.componentRef.setInput('accounts', accounts.slice(0, 4));
        fixture.detectChanges();
        expect(host.querySelector('.account-currency-select')).toBeNull();
        expect(host.querySelectorAll('.account-currencies button')).toHaveLength(4);
        expect(
            host.querySelector('.account-currencies [aria-pressed="true"]')?.textContent,
        ).toContain('EUR');
    });
});
