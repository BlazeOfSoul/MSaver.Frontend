import { TransferDraft } from '../../home-page.models';
import {
    appendMoneyInputCurrency,
    formatMoneyInputAmount,
    normalizeMoneyInputText,
    parseMoneyInputAmount,
    roundMoneyInputAmount,
} from '../../../../../shared/utils/money-input.utils';

const RATE_FRACTION_DIGITS = 3;
const INVERTED_RATE_FRACTION_DIGITS = 6;

export interface CanSubmitAccountTransferOptions {
    accountOptionCount: number;
    draft: TransferDraft;
    usesDifferentCurrencies: boolean;
    rateLoading: boolean;
    saving: boolean;
}

export function formatTransferMoneyAmount(value: number): string {
    return formatMoneyInputAmount(value);
}

export function parseTransferMoneyAmount(value: string | number): number {
    return parseMoneyInputAmount(value);
}

export function normalizeTransferMoneyInputText(
    value: string,
    isEditing: boolean,
    currentAmount: number,
): string {
    return normalizeMoneyInputText(value, isEditing, currentAmount);
}

export function parseTransferRateInput(value: string | number): number {
    const normalized = normalizeNumericInput(value);
    const parsed = Number.parseFloat(normalized);

    if (!Number.isFinite(parsed) || parsed <= 0) {
        return 0;
    }

    return roundTo(parsed, RATE_FRACTION_DIGITS);
}

export function formatTransferRate(value: number): string {
    return Number.isFinite(value)
        ? value.toLocaleString('ru-RU', {
              minimumFractionDigits: 2,
              maximumFractionDigits: RATE_FRACTION_DIGITS,
          })
        : '';
}

export function displayTransferRate(rate: number | null): string {
    if (!rate || rate <= 0) {
        return '';
    }

    return formatTransferRate(rate < 1 ? 1 / rate : rate);
}

export function toTransferDraftRate(
    displayRate: string | number,
    isBankRateInverted: boolean,
): number | null {
    const parsed = parseTransferRateInput(displayRate);

    if (parsed <= 0) {
        return null;
    }

    return isBankRateInverted ? roundTo(1 / parsed, INVERTED_RATE_FRACTION_DIGITS) : parsed;
}

export function transferReceiveRate(usesDifferentCurrencies: boolean, rate: number | null): number {
    return usesDifferentCurrencies ? (rate ?? 0) : 1;
}

export function calculateTransferReceiveAmount(withdrawAmount: number, receiveRate: number): number {
    if (!withdrawAmount || withdrawAmount <= 0 || receiveRate <= 0) {
        return 0;
    }

    return roundMoneyInputAmount(withdrawAmount * receiveRate);
}

export function calculateTransferWithdrawAmount(receiveAmount: number, receiveRate: number): number {
    if (!receiveAmount || receiveAmount <= 0 || receiveRate <= 0) {
        return 0;
    }

    return roundMoneyInputAmount(receiveAmount / receiveRate);
}

export function canSubmitAccountTransfer(options: CanSubmitAccountTransferOptions): boolean {
    const { accountOptionCount, draft, usesDifferentCurrencies, rateLoading, saving } = options;
    const hasRequiredRate =
        !usesDifferentCurrencies || (!!draft.rate && draft.rate > 0 && !rateLoading);

    return (
        accountOptionCount > 1 &&
        draft.amount > 0 &&
        draft.fromAccountId !== draft.toAccountId &&
        hasRequiredRate &&
        !saving
    );
}

export function appendTransferCurrency(value: string, currencyCode: string): string {
    return appendMoneyInputCurrency(value, currencyCode);
}

function normalizeNumericInput(value: string | number): string {
    return `${value ?? ''}`.replace(',', '.').replace(/\s/g, '').trim();
}

function roundTo(value: number, fractionDigits: number): number {
    const multiplier = 10 ** fractionDigits;

    return Math.round(value * multiplier) / multiplier;
}
