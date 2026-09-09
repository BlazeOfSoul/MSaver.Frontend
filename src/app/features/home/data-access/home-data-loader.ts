import { Injectable, inject } from '@angular/core';
import {
    Observable,
    catchError,
    from,
    map,
    mergeMap,
    of,
    range,
    reduce,
    switchMap,
    toArray,
} from 'rxjs';
import { AccountResponse, MonthBalanceResponse, PagedResponse } from './home-api.models';
import { HomeApiService } from './home-api.service';

export class ExchangeRateMap extends Map<string, number> {
    updatedAtUtc?: string;
    isStale = false;
}

/** Bounded requests keep mobile connections responsive; page order remains deterministic. */
export function loadAllPages<T>(
    loadPage: (page: number) => Observable<PagedResponse<T>>,
): Observable<T[]> {
    return loadPage(1).pipe(
        switchMap((first) => {
            if (first.totalPages <= 1) return of(first.items);
            return range(2, first.totalPages - 1).pipe(
                mergeMap(
                    (page) => loadPage(page).pipe(map((result) => ({ page, items: result.items }))),
                    4,
                ),
                toArray(),
                map((pages) => [
                    ...first.items,
                    ...pages.sort((a, b) => a.page - b.page).flatMap((page) => page.items),
                ]),
            );
        }),
    );
}

@Injectable({ providedIn: 'root' })
export class HomeDataLoader {
    private readonly api = inject(HomeApiService);

    monthBalances(accounts: AccountResponse[], months: Date[]): Observable<MonthBalanceResponse[]> {
        return from(
            accounts.flatMap((account) => months.map((month) => ({ account, month }))),
        ).pipe(
            mergeMap(
                ({ account, month }) =>
                    this.api.getMonthBalance(account.id, month.getFullYear(), month.getMonth() + 1),
                4,
            ),
            toArray(),
        );
    }

    exchangeRates(accounts: AccountResponse[], currency: string): Observable<ExchangeRateMap> {
        const target = accounts.find((account) => account.currencyCode === currency);
        const groups = new Map<string, AccountResponse[]>();
        for (const account of accounts) {
            const group = groups.get(account.currencyCode) ?? [];
            group.push(account);
            groups.set(account.currencyCode, group);
        }
        return from(groups.entries()).pipe(
            mergeMap(([code, group]) => {
                if (code === currency)
                    return of({
                        group,
                        rate: 1,
                        isStale: false,
                        updatedAtUtc: undefined as string | undefined,
                    });
                const request = target
                    ? this.api.getTransferRate(group[0].id, target.id)
                    : this.api.getExchangeRate(code, currency);
                return request.pipe(
                    map((response) => ({
                        group,
                        rate:
                            Number.isFinite(response.rate) && response.rate > 0
                                ? response.rate
                                : NaN,
                        isStale: response.isStale ?? false,
                        updatedAtUtc: response.updatedAtUtc,
                    })),
                    catchError(() =>
                        of({
                            group,
                            rate: NaN,
                            isStale: false,
                            updatedAtUtc: undefined as string | undefined,
                        }),
                    ),
                );
            }, 4),
            reduce((rates, result) => {
                result.group.forEach((account) => rates.set(account.id, result.rate));
                rates.isStale ||= result.isStale;
                if (
                    result.updatedAtUtc &&
                    (!rates.updatedAtUtc || result.updatedAtUtc < rates.updatedAtUtc)
                )
                    rates.updatedAtUtc = result.updatedAtUtc;
                return rates;
            }, new ExchangeRateMap()),
        );
    }
}
