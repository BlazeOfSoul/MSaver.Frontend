import { PagedResponse, TransactionResponse } from '../data-access/home-api.models';
import { TransactionPagination } from './home-page.models';

export function createEmptyTransactionPage(
    size: number,
): PagedResponse<TransactionResponse> {
    return {
        items: [],
        page: 1,
        size,
        totalCount: 0,
        totalPages: 1,
        hasPreviousPage: false,
        hasNextPage: false,
    };
}

export function mapTransactionPagination(
    page: PagedResponse<TransactionResponse>,
): TransactionPagination {
    const totalPages = Math.max(1, page.totalPages);
    const currentPage = Math.min(Math.max(1, page.page), totalPages);

    return {
        page: currentPage,
        size: page.size,
        totalCount: page.totalCount,
        totalPages,
        hasPreviousPage: currentPage > 1,
        hasNextPage: currentPage < totalPages,
    };
}
