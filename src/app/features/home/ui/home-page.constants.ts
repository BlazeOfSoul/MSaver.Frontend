import { MsSelectOption } from '../../../shared/ui/select/select';
import { HomeTabItem } from './home-page.models';

export const ACCOUNT_COLORS = ['#23c78b', '#ffd166', '#67a6c1', '#ff8fab', '#c77dff'];
export const CATEGORY_COLORS = ['#23c78b', '#67a6c1', '#ff6f91', '#e8b45d', '#c77dff', '#79e0b5'];

export const CURRENCY_OPTIONS: ReadonlyArray<MsSelectOption> = [{ value: 'BYN', label: 'BYN' }];

export const HOME_TABS: ReadonlyArray<HomeTabItem> = [
    { id: 'overview', label: 'Главная', icon: 'grid_view' },
    { id: 'accounts', label: 'Счета', icon: 'account_balance' },
    { id: 'analytics', label: 'Аналитика', icon: 'monitoring' },
    { id: 'categories', label: 'Категории', icon: 'category' },
];
