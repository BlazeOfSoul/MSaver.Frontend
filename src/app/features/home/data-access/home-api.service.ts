import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
    AccountResponse,
    AssignTagCategoriesRequest,
    CategoryResponse,
    CreateAccountRequest,
    CreateCategoryRequest,
    CreateTagRequest,
    CreateTransactionRequest,
    CreateTransferResponse,
    CreateTransferRequest,
    CurrentUserResponse,
    MonthBalanceResponse,
    PagedResponse,
    TagDetailsResponse,
    TagResponse,
    TransactionResponse,
    TransferRateResponse,
    UpdateTransactionRequest,
} from './home-api.models';

const LIST_SIZE = 100;

interface ListRequestParams {
    page?: number;
    size?: number;
}

@Injectable({
    providedIn: 'root',
})
export class HomeApiService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = environment.apiUrl;

    getCurrentUser(): Observable<CurrentUserResponse> {
        return this.http.get<CurrentUserResponse>(`${this.baseUrl}/Users/me`);
    }

    getAccounts(request: ListRequestParams = {}): Observable<PagedResponse<AccountResponse>> {
        const params = new HttpParams()
            .set('page', request.page ?? 1)
            .set('size', request.size ?? LIST_SIZE)
            .set('isArchived', false)
            .set('sortBy', 'name')
            .set('sortDirection', 'asc');

        return this.http.get<PagedResponse<AccountResponse>>(`${this.baseUrl}/Accounts`, {
            params,
        });
    }

    createAccount(payload: CreateAccountRequest): Observable<string> {
        return this.http.post<string>(`${this.baseUrl}/Accounts`, payload);
    }

    deleteAccount(accountId: string): Observable<string> {
        return this.http.delete<string>(`${this.baseUrl}/Accounts/${accountId}`);
    }

    getMonthBalance(
        accountId: string,
        year: number,
        month: number,
    ): Observable<MonthBalanceResponse> {
        const params = new HttpParams().set('year', year).set('month', month);

        return this.http.get<MonthBalanceResponse>(
            `${this.baseUrl}/Accounts/${accountId}/month-balance`,
            { params },
        );
    }

    getCategories(request: ListRequestParams = {}): Observable<PagedResponse<CategoryResponse>> {
        const params = new HttpParams()
            .set('page', request.page ?? 1)
            .set('size', request.size ?? LIST_SIZE)
            .set('sortBy', 'name')
            .set('sortDirection', 'asc');

        return this.http.get<PagedResponse<CategoryResponse>>(`${this.baseUrl}/Categories`, {
            params,
        });
    }

    createCategory(payload: CreateCategoryRequest): Observable<string> {
        return this.http.post<string>(`${this.baseUrl}/Categories`, payload);
    }

    deleteCategory(categoryId: string): Observable<string> {
        return this.http.delete<string>(`${this.baseUrl}/Categories/${categoryId}`);
    }

    getTags(request: ListRequestParams = {}): Observable<PagedResponse<TagResponse>> {
        const params = new HttpParams()
            .set('page', request.page ?? 1)
            .set('size', request.size ?? LIST_SIZE)
            .set('sortBy', 'name')
            .set('sortDirection', 'asc');

        return this.http.get<PagedResponse<TagResponse>>(`${this.baseUrl}/Tags`, {
            params,
        });
    }

    getTagById(tagId: string): Observable<TagDetailsResponse> {
        return this.http.get<TagDetailsResponse>(`${this.baseUrl}/Tags/${tagId}`);
    }

    createTag(payload: CreateTagRequest): Observable<string> {
        return this.http.post<string>(`${this.baseUrl}/Tags`, payload);
    }

    deleteTag(tagId: string): Observable<string> {
        return this.http.delete<string>(`${this.baseUrl}/Tags/${tagId}`);
    }

    assignTagCategories(tagId: string, payload: AssignTagCategoriesRequest): Observable<string> {
        return this.http.put<string>(`${this.baseUrl}/Tags/${tagId}/categories`, payload);
    }

    getTransactions(params: {
        accountId?: string;
        fromDate: string;
        toDate: string;
        search?: string;
        page?: number;
        size?: number;
    }): Observable<PagedResponse<TransactionResponse>> {
        let httpParams = new HttpParams()
            .set('page', params.page ?? 1)
            .set('size', params.size ?? LIST_SIZE)
            .set('fromDate', params.fromDate)
            .set('toDate', params.toDate)
            .set('sortBy', 'date')
            .set('sortDirection', 'desc');

        if (params.accountId) {
            httpParams = httpParams.set('accountId', params.accountId);
        }

        if (params.search) {
            httpParams = httpParams.set('search', params.search);
        }

        return this.http.get<PagedResponse<TransactionResponse>>(`${this.baseUrl}/Transactions`, {
            params: httpParams,
        });
    }

    createTransaction(payload: CreateTransactionRequest): Observable<string> {
        return this.http.post<string>(`${this.baseUrl}/Transactions`, payload);
    }

    updateTransaction(transactionId: string, payload: UpdateTransactionRequest): Observable<string> {
        return this.http.put<string>(`${this.baseUrl}/Transactions/${transactionId}`, payload);
    }

    deleteTransaction(transactionId: string): Observable<string> {
        return this.http.delete<string>(`${this.baseUrl}/Transactions/${transactionId}`);
    }

    createTransfer(payload: CreateTransferRequest): Observable<CreateTransferResponse> {
        return this.http.post<CreateTransferResponse>(
            `${this.baseUrl}/Transactions/transfer`,
            payload,
        );
    }

    getTransferRate(fromAccountId: string, toAccountId: string): Observable<TransferRateResponse> {
        const params = new HttpParams()
            .set('fromAccountId', fromAccountId)
            .set('toAccountId', toAccountId);

        return this.http.get<TransferRateResponse>(`${this.baseUrl}/Transactions/transfer-rate`, {
            params,
        });
    }
}
