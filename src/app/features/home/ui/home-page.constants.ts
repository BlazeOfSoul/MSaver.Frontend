import { MsSelectOption } from '../../../shared/ui/select/select';
import { HomeTabItem } from './home-page.models';

export const ACCOUNT_COLORS = ['#23c78b', '#ffd166', '#67a6c1', '#ff8fab', '#c77dff'];
export const CATEGORY_COLORS = ['#23c78b', '#67a6c1', '#ff6f91', '#e8b45d', '#c77dff', '#79e0b5'];

export const CURRENCY_OPTIONS: ReadonlyArray<MsSelectOption> = [
    { value: 'BYN', label: 'BYN - Белорусский рубль' },
    { value: 'USD', label: 'USD - Доллар США' },
    { value: 'EUR', label: 'EUR - Евро' },
    { value: 'RUB', label: 'RUB - Российский рубль' },
    { value: 'GBP', label: 'GBP - Британский фунт' },
    { value: 'CHF', label: 'CHF - Швейцарский франк' },
    { value: 'PLN', label: 'PLN - Польский злотый' },
    { value: 'CZK', label: 'CZK - Чешская крона' },
    { value: 'SEK', label: 'SEK - Шведская крона' },
    { value: 'NOK', label: 'NOK - Норвежская крона' },
    { value: 'DKK', label: 'DKK - Датская крона' },
    { value: 'CNY', label: 'CNY - Китайский юань' },
    { value: 'JPY', label: 'JPY - Японская иена' },
    { value: 'KRW', label: 'KRW - Южнокорейская вона' },
    { value: 'INR', label: 'INR - Индийская рупия' },
    { value: 'SGD', label: 'SGD - Сингапурский доллар' },
    { value: 'HKD', label: 'HKD - Гонконгский доллар' },
    { value: 'THB', label: 'THB - Тайский бат' },
    { value: 'KZT', label: 'KZT - Казахстанский тенге' },
    { value: 'UAH', label: 'UAH - Украинская гривна' },
    { value: 'GEL', label: 'GEL - Грузинский лари' },
    { value: 'AMD', label: 'AMD - Армянский драм' },
    { value: 'AZN', label: 'AZN - Азербайджанский манат' },
    { value: 'BRL', label: 'BRL - Бразильский реал' },
    { value: 'ARS', label: 'ARS - Аргентинское песо' },
    { value: 'CLP', label: 'CLP - Чилийское песо' },
    { value: 'COP', label: 'COP - Колумбийское песо' },
    { value: 'PEN', label: 'PEN - Перуанский соль' },
    { value: 'UYU', label: 'UYU - Уругвайское песо' },
].sort((left, right) => left.value.localeCompare(right.value, 'en'));

export const HOME_TABS: ReadonlyArray<HomeTabItem> = [
    { id: 'overview', label: 'Главная', icon: 'grid_view' },
    { id: 'accounts', label: 'Счета', icon: 'account_balance' },
    { id: 'analytics', label: 'Аналитика', icon: 'monitoring' },
    { id: 'categories', label: 'Категории', icon: 'category' },
];
