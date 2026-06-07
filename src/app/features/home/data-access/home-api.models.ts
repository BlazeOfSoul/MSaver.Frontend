export type CategoryType = 'Debit' | 'Credit' | 'TransferIncome' | 'TransferExpense';

export interface PagedResponse<T> {
    items: T[];
    page: number;
    size: number;
    totalCount: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
}

export interface AccountResponse {
    id: string;
    name: string;
    currencyCode: string;
    currentBalance: number;
    color: string | null;
    isArchived: boolean;
    isPrimary?: boolean;
}

export interface CurrentUserResponse {
    id: string;
    username: string;
    email: string;
    applicationCurrencyCode: string;
}

export interface UpdateApplicationCurrencyRequest {
    applicationCurrencyCode: string;
}

export interface MonthBalanceResponse {
    accountId: string;
    accountName: string;
    currencyCode: string;
    openingBalance: number;
    monthChange: number;
    closingBalance: number;
    year: number;
    month: number;
}

export interface CreateAccountRequest {
    currencyCode: string;
    name: string;
    color: string;
}

export interface CategoryResponse {
    id: string;
    name: string;
    type: CategoryType;
    color: string;
    isSystem?: boolean;
}

export interface CreateCategoryRequest {
    name: string;
    type: CategoryType;
    color: string;
}

export interface TagResponse {
    id: string;
    name: string;
    color: string | null;
}

export interface TagCategoryResponse {
    id: string;
    name: string;
    color: string;
    type: CategoryType;
    isDeleted: boolean;
}

export interface TagDetailsResponse {
    id: string;
    name: string;
    color: string | null;
    isDeleted: boolean;
    categories: TagCategoryResponse[];
}

export interface CreateTagRequest {
    name: string;
    color: string;
}

export interface AssignTagCategoriesRequest {
    categoryIds: string[];
}

export interface TransactionAccountResponse {
    id: string;
    name: string;
    color: string | null;
    currencyCode: string;
    isArchived: boolean;
}

export interface TransactionCategoryResponse {
    id: string;
    name: string;
    type: CategoryType;
    color: string;
}

export interface TransactionResponse {
    id: string;
    account: TransactionAccountResponse;
    category: TransactionCategoryResponse;
    amount: number;
    date: string;
    description: string;
}

export interface CreateTransactionRequest {
    accountId: string;
    categoryId: string;
    description: string;
    amount: number;
    date: string;
}

export interface UpdateTransactionRequest {
    categoryId: string;
    description: string;
    amount: number;
    date: string;
}

export interface CreateTransferRequest {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    date: string;
    rate: number | null;
    description: string | null;
}

export interface CreateTransferResponse {
    expenseTransactionId: string;
    incomeTransactionId: string;
    withdrawAmount: number;
    depositAmount: number;
    rate: number;
    fromCurrencyCode: string;
    toCurrencyCode: string;
}

export interface TransferRateResponse {
    rate: number;
    fromCurrencyCode: string;
    toCurrencyCode: string;
}
