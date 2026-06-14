import { TransactionResponse } from '../data-access/home-api.models';
import {
    createEmptyTransactionPage,
    mapTransactionPagination,
} from './home-transaction-pagination.utils';

describe('home transaction pagination utils', () => {
    it('creates an empty first transaction page for the requested page size', () => {
        expect(createEmptyTransactionPage(50)).toEqual({
            items: [],
            page: 1,
            size: 50,
            totalCount: 0,
            totalPages: 1,
            hasPreviousPage: false,
            hasNextPage: false,
        });
    });

    it('normalizes backend pagination metadata for the overview journal', () => {
        const pagination = mapTransactionPagination({
            items: [] as TransactionResponse[],
            page: 5,
            size: 25,
            totalCount: 2,
            totalPages: 2,
            hasPreviousPage: false,
            hasNextPage: true,
        });

        expect(pagination).toEqual({
            page: 2,
            size: 25,
            totalCount: 2,
            totalPages: 2,
            hasPreviousPage: true,
            hasNextPage: false,
        });
    });

    it('keeps pagination usable when the backend reports zero pages', () => {
        const pagination = mapTransactionPagination({
            items: [] as TransactionResponse[],
            page: 0,
            size: 25,
            totalCount: 0,
            totalPages: 0,
            hasPreviousPage: true,
            hasNextPage: true,
        });

        expect(pagination).toEqual({
            page: 1,
            size: 25,
            totalCount: 0,
            totalPages: 1,
            hasPreviousPage: false,
            hasNextPage: false,
        });
    });
});
