import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStore } from '../../auth/data-access/auth.store';
import { Button } from '../../../shared/ui/button/button';
import { SectionHeader } from '../../../shared/ui/section-header/section-header';
import { Surface } from '../../../shared/ui/surface/surface';

type MetricTone = 'success' | 'warning' | 'info';
type ActionTone = 'income' | 'expense' | 'budget';

interface MetricCard {
    label: string;
    value: string;
    meta: string;
    detail: string;
    icon: string;
    tone: MetricTone;
}

interface QuickAction {
    label: string;
    description: string;
    icon: string;
    tone: ActionTone;
}

interface ActivityItem {
    title: string;
    category: string;
    amount: string;
    icon: string;
    tone: 'income' | 'expense';
}

interface BudgetItem {
    label: string;
    value: string;
    progress: number;
    tone: MetricTone;
}

@Component({
    selector: 'app-home-page',
    standalone: true,
    imports: [Button, SectionHeader, Surface],
    templateUrl: './home-page.component.html',
    styleUrl: './home-page.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePageComponent {
    readonly authStore = inject(AuthStore);
    private readonly router = inject(Router);

    readonly metrics: MetricCard[] = [
        {
            label: 'Баланс',
            value: '12 480 BYN',
            meta: '+8.2% за месяц',
            detail: 'Доступно после плановых расходов',
            icon: 'account_balance_wallet',
            tone: 'success',
        },
        {
            label: 'Расходы',
            value: '2 140 BYN',
            meta: '62% от бюджета',
            detail: 'На 340 BYN меньше прошлого месяца',
            icon: 'trending_down',
            tone: 'warning',
        },
        {
            label: 'Доходы',
            value: '4 900 BYN',
            meta: '3 поступления',
            detail: 'Следующее поступление через 6 дней',
            icon: 'payments',
            tone: 'info',
        },
    ];

    readonly quickActions: QuickAction[] = [
        {
            label: 'Добавить доход',
            description: 'Зафиксировать новое поступление',
            icon: 'add_circle',
            tone: 'income',
        },
        {
            label: 'Добавить расход',
            description: 'Записать покупку или платеж',
            icon: 'remove_circle',
            tone: 'expense',
        },
        {
            label: 'Настроить бюджет',
            description: 'Обновить лимиты по категориям',
            icon: 'tune',
            tone: 'budget',
        },
    ];

    readonly activities: ActivityItem[] = [
        {
            title: 'Зарплата',
            category: 'Доход',
            amount: '+3 800 BYN',
            icon: 'work',
            tone: 'income',
        },
        {
            title: 'Продукты',
            category: 'Ежедневные расходы',
            amount: '-184 BYN',
            icon: 'shopping_cart',
            tone: 'expense',
        },
        {
            title: 'Подписки',
            category: 'Сервисы',
            amount: '-42 BYN',
            icon: 'subscriptions',
            tone: 'expense',
        },
    ];

    readonly budgets: BudgetItem[] = [
        {
            label: 'Дом и счета',
            value: '74%',
            progress: 74,
            tone: 'info',
        },
        {
            label: 'Еда и кафе',
            value: '58%',
            progress: 58,
            tone: 'warning',
        },
        {
            label: 'Накопления',
            value: '86%',
            progress: 86,
            tone: 'success',
        },
    ];

    logout(): void {
        this.authStore.clearSession();
        this.router.navigateByUrl('/auth');
    }
}
