import assert from 'node:assert/strict';
import fs from 'node:fs';
const base = process.env.MSAVER_QA_URL ?? 'http://127.0.0.1:4303';
if (new URL(base).hostname !== '127.0.0.1' || new URL(base).port !== '4303')
    throw Error('QA runs only on the isolated local backend port 4303.');
const checks = [];
fs.mkdirSync('.tmp', { recursive: true });
const suffix = Date.now();
const password = 'Local-QA-2026!';
const email = 'qa-preview-' + suffix + '@example.test';
const otherEmail = 'qa-other-' + suffix + '@example.test';
function check(name, action) {
    action();
    checks.push(name);
    console.log('PASS ' + name);
}
async function request(path, { method = 'GET', body, cookies = '', expected } = {}) {
    const response = await fetch(base + '/api' + path, {
        method,
        headers: { 'Content-Type': 'application/json', Cookie: cookies },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    let data;
    try {
        data = text ? JSON.parse(text) : null;
    } catch {
        data = text;
    }
    if (expected !== undefined)
        assert.equal(response.status, expected, method + ' ' + path + ' ' + JSON.stringify(data));
    else
        assert.ok(
            response.ok,
            method + ' ' + path + ' ' + response.status + ' ' + JSON.stringify(data),
        );
    return {
        data,
        response,
        cookies: response.headers
            .getSetCookie()
            .map((cookie) => cookie.split(';')[0])
            .join('; '),
    };
}
const idOf = (value) =>
    typeof value === 'string' ? value : (value.id ?? value.accountId ?? value.transactionId);
await request('/Auth/register', {
    method: 'POST',
    body: { username: 'Тестовый пользователь', email, password },
});
await request('/Auth/register', {
    method: 'POST',
    body: { username: 'Другой пользователь', email: otherEmail, password },
});
const alice = await request('/Auth/login', { method: 'POST', body: { email, password } });
const bob = await request('/Auth/login', { method: 'POST', body: { email: otherEmail, password } });
check('Login creates HttpOnly cookies and returns no token payload', () => {
    assert.ok(
        alice.response.headers
            .getSetCookie()
            .every((cookie) => cookie.includes('httponly') || cookie.includes('HttpOnly')),
    );
    assert.equal(alice.data.accessToken, undefined);
});
const api = (path, options = {}) => request(path, { cookies: alice.cookies, ...options });
const current = (await api('/Users/me')).data;
check('Existing authenticated user contract is preserved', () =>
    assert.equal(current.id, alice.data.id),
);
const badPassword = await request('/Auth/login', {
    method: 'POST',
    body: { email, password: 'Wrong-password!' },
    expected: 400,
});
const missingEmail = await request('/Auth/login', {
    method: 'POST',
    body: { email: 'missing-' + suffix + '@example.test', password: 'Wrong-password!' },
    expected: 400,
});
check('Unknown email and wrong password are indistinguishable in status and body', () =>
    assert.deepEqual(badPassword.data, missingEmail.data),
);
const mainId = idOf(
    (
        await api('/Accounts', {
            method: 'POST',
            body: {
                name: 'Основной счёт',
                currencyCode: 'BYN',
                initialBalance: 1000,
                color: '#23c78b',
            },
        })
    ).data,
);
const usdId = idOf(
    (
        await api('/Accounts', {
            method: 'POST',
            body: {
                name: 'Долларовый резерв',
                currencyCode: 'USD',
                initialBalance: 100,
                color: '#5896ed',
            },
        })
    ).data,
);
const homeId = idOf(
    (
        await api('/Accounts', {
            method: 'POST',
            body: { name: 'Дома', currencyCode: 'BYN', initialBalance: 200, color: '#eab44f' },
        })
    ).data,
);
for (let i = 1; i <= 7; i++)
    await api('/Accounts', {
        method: 'POST',
        body: {
            name: 'Резервный счёт ' + i,
            currencyCode: 'BYN',
            initialBalance: i * 10,
            color: '#23c78b',
        },
    });
const categories = (await api('/Categories?size=100')).data.items;
for (const [name, type] of [
    ['Дано в долг (-)', 'Debit'],
    ['Отдано по долгу (+)', 'Credit'],
    ['Взято в долг (+)', 'Credit'],
    ['Возвращено по долгу (-)', 'Debit'],
]) {
    if (!categories.some((item) => item.name === name)) {
        const id = idOf(
            (await api('/Categories', { method: 'POST', body: { name, type, color: '#23c78b' } }))
                .data,
        );
        categories.push({ id, name, type });
    }
}
const category = (prefix) => {
    const value = categories.find((item) => item.name.toLowerCase().startsWith(prefix));
    assert.ok(value, 'Category: ' + prefix);
    return value;
};
const given = category('дано в долг'),
    received = category('отдано по долгу'),
    taken = category('взято в долг'),
    returned = category('возвращено по долгу');
const expense = idOf(
    (
        await api('/Categories', {
            method: 'POST',
            body: { name: 'QA Продукты', type: 'Debit', color: '#ef6d82' },
        })
    ).data,
);
const income = idOf(
    (
        await api('/Categories', {
            method: 'POST',
            body: { name: 'QA Зарплата', type: 'Credit', color: '#23c78b' },
        })
    ).data,
);
const fixtures = [
    [given.id, -90, '2025-12-10', 'Выдано в прошлом году'],
    [received.id, 90, '2026-02-10', 'Возврат долга прошлого года'],
    [given.id, -40, '2026-07-10', 'Июль: выдано 40'],
    [received.id, 40, '2026-08-10', 'Август: возвращено 40'],
    [given.id, -70, '2026-09-01', 'Сентябрь: выдано в долг 70 Br'],
    [received.id, 30, '2026-09-04', 'Частичный возврат 30'],
    [received.id, 40, '2026-09-05', 'Окончательный возврат 40'],
    [taken.id, 120, '2026-01-10', 'Взято 120'],
    [returned.id, -50, '2026-03-10', 'Возвращено 50'],
    [returned.id, -70, '2026-04-10', 'Возвращено оставшиеся 70'],
];
for (const [categoryId, amount, date, description] of fixtures)
    await api('/Transactions', {
        method: 'POST',
        body: { accountId: mainId, categoryId, amount, date: date + 'T12:00:00Z', description },
    });
for (let month = 1; month <= 9; month++) {
    const date = '2026-' + String(month).padStart(2, '0') + '-02T12:00:00Z';
    await api('/Transactions', {
        method: 'POST',
        body: {
            accountId: mainId,
            categoryId: income,
            amount: month === 8 ? 100 : 1000,
            date,
            description: 'QA доход ' + month,
        },
    });
    await api('/Transactions', {
        method: 'POST',
        body: {
            accountId: mainId,
            categoryId: expense,
            amount: month === 8 ? -180 : -250,
            date,
            description: 'QA расходы ' + month,
        },
    });
}
for (let i = 1; i <= 24; i++)
    await api('/Transactions', {
        method: 'POST',
        body: {
            accountId: homeId,
            categoryId: expense,
            amount: -1,
            date: '2026-09-06T' + String(i % 24).padStart(2, '0') + ':00:00Z',
            description: 'Покупка QA ' + i,
        },
    });
await api('/Transactions', {
    method: 'POST',
    body: {
        accountId: homeId,
        categoryId: income,
        amount: 3,
        date: '2026-10-01T00:00:00Z',
        description: 'Граница следующего месяца',
    },
});
const rows = (await api('/Transactions?size=100&sortBy=date&sortDirection=asc')).data.items;
check('Debt issued in prior year and several months is fully repaid', () => {
    assert.equal(
        rows
            .filter((row) => [given.id, received.id].includes(row.category.id))
            .reduce((sum, row) => sum + row.amount, 0),
        0,
    );
    assert.equal(
        rows
            .filter((row) => [taken.id, returned.id].includes(row.category.id))
            .reduce((sum, row) => sum + row.amount, 0),
        0,
    );
    assert.equal(
        rows
            .filter(
                (row) =>
                    [given.id, received.id].includes(row.category.id) && row.date < '2026-09-05',
            )
            .reduce((sum, row) => sum + row.amount, 0),
        -40,
    );
});
const query = new URLSearchParams({
    accountId: homeId,
    categoryId: expense,
    fromDate: '2026-09-01T00:00:00Z',
    toDate: '2026-10-01T00:00:00Z',
    search: 'Покупка QA',
    size: '10',
    sortBy: 'date',
    sortDirection: 'asc',
});
const first = (await api('/Transactions?' + query)).data;
query.set('page', '2');
const second = (await api('/Transactions?' + query)).data;
check('Combined account/category/month/search/sort/page filters agree', () => {
    assert.equal(first.totalCount, 24);
    assert.equal(first.items.length, 10);
    assert.equal(second.items.length, 10);
    assert.ok(
        first.items.every(
            (row) =>
                row.account.id === homeId &&
                row.category.id === expense &&
                row.date >= '2026-09-01' &&
                row.date < '2026-10-01',
        ),
    );
    assert.equal(new Set([...first.items, ...second.items].map((row) => row.id)).size, 20);
    assert.ok(first.items.every((row, i) => i === 0 || row.date >= first.items[i - 1].date));
});
const boundary = (
    await api(
        '/Transactions?' +
            new URLSearchParams({
                accountId: homeId,
                fromDate: '2026-09-01T00:00:00Z',
                toDate: '2026-10-01T00:00:00Z',
                size: '100',
            }),
    )
).data;
check('The next month midnight is excluded from the previous month', () =>
    assert.equal(boundary.totalCount, 24),
);
const filteredAccounts = (
    await api('/Accounts?currencyCode=USD&search=' + encodeURIComponent('резерв'))
).data.items;
check('Account currency and search filters combine correctly', () =>
    assert.deepEqual(
        filteredAccounts.map((item) => item.id),
        [usdId],
    ),
);
const foreign = await request('/Accounts/' + mainId, { cookies: bob.cookies, expected: 404 });
check('Another user cannot read an account or its transactions', () =>
    assert.equal(foreign.response.status, 404),
);
assert.equal(
    (await request('/Transactions?accountId=' + mainId, { cookies: bob.cookies })).data.items
        .length,
    0,
);
const before = (await api('/Accounts/' + mainId)).data;
const temporaryId = idOf(
    (
        await api('/Transactions', {
            method: 'POST',
            body: {
                accountId: mainId,
                categoryId: expense,
                amount: -12,
                date: '2026-09-07T12:00:00Z',
                description: 'QA editable',
            },
        })
    ).data,
);
await api('/Transactions/' + temporaryId, {
    method: 'PUT',
    body: {
        categoryId: expense,
        amount: -19,
        date: '2026-08-07T12:00:00Z',
        description: 'QA edited',
    },
});
assert.equal((await api('/Transactions/' + temporaryId)).data.amount, -19);
await api('/Transactions/' + temporaryId, { method: 'DELETE' });
check('Editing amount and month then deleting restores the account balance', () => {});
assert.equal((await api('/Accounts/' + mainId)).data.currentBalance, before.currentBalance);
const rate = (
    await api('/Transactions/transfer-rate?fromAccountId=' + usdId + '&toAccountId=' + mainId)
).data;
assert.equal(rate.rate, 3.2);
assert.ok(rate.updatedAtUtc);
assert.equal(rate.isStale, false);
const noAccountCurrency = (await api('/exchange-rates?fromCurrencyCode=BYN&toCurrencyCode=EUR'))
    .data;
check('Currency snapshot supplies direct and cross rates plus freshness', () =>
    assert.equal(noAccountCurrency.rate, 0.92 / 3.2),
);
const usdBefore = (await api('/Accounts/' + usdId)).data.currentBalance;
const bynBefore = (await api('/Accounts/' + mainId)).data.currentBalance;
const transfer = (
    await api('/Transactions/transfer', {
        method: 'POST',
        body: {
            fromAccountId: usdId,
            toAccountId: mainId,
            amount: 10,
            date: '2026-09-07T12:00:00Z',
            description: 'QA перевод USD → BYN',
            rate: null,
        },
    })
).data;
check('Cross-currency transfer debits and credits the expected amounts', () => {});
assert.equal((await api('/Accounts/' + usdId)).data.currentBalance, usdBefore - 10);
assert.equal((await api('/Accounts/' + mainId)).data.currentBalance, bynBefore + 32);
await api('/Transactions/transfer', {
    method: 'POST',
    body: {
        fromAccountId: mainId,
        toAccountId: homeId,
        amount: 25,
        date: '2026-07-12T12:00:00Z',
        description: 'QA перевод домой',
        rate: 1,
    },
});
const aliceSecond = await request('/Auth/login', { method: 'POST', body: { email, password } });
const sessions = (await api('/Auth/sessions')).data;
check('Session list exposes only own sessions and no refresh secrets', () => {
    assert.equal(sessions.length, 2);
    assert.equal(sessions.filter((item) => item.isCurrent).length, 1);
    assert.ok(sessions.every((item) => !('token' in item) && !('userId' in item)));
});
await request('/Auth/sessions/' + aliceSecond.data.clientId, {
    method: 'DELETE',
    cookies: bob.cookies,
    expected: 204,
});
await request('/Users/me', { cookies: aliceSecond.cookies, expected: 200 });
check('Revocation is scoped to the owner even with another user’s session id', () => {});
await api('/Auth/sessions/' + aliceSecond.data.clientId, { method: 'DELETE' });
await request('/Users/me', { cookies: aliceSecond.cookies, expected: 401 });
check('Session revocation immediately invalidates the existing access JWT', () => {});
const refreshPair = alice.cookies
    .split('; ')
    .find((cookie) => cookie.startsWith('msaver_refresh='));
assert.ok(refreshPair, 'Login must issue the existing refresh cookie');
{
    const response = await fetch(base + '/api/Users/me', {
        headers: {
            Authorization:
                'Bearer ' + decodeURIComponent(refreshPair.slice(refreshPair.indexOf('=') + 1)),
        },
    });
    assert.equal(response.status, 401);
}
check('A refresh JWT cannot authorize an API request', () => {});
await api('/Auth/logout-all', { method: 'POST', body: {} });
await api('/Users/me', { expected: 401 });
check('Logout-all invalidates the current access token too', () => {});
fs.writeFileSync(
    '.tmp/qa-seed.json',
    JSON.stringify(
        {
            base,
            email,
            password,
            mainId,
            usdId,
            homeId,
            expense,
            income,
            categories: {
                given: given.id,
                received: received.id,
                taken: taken.id,
                returned: returned.id,
            },
            transfer,
            checks,
        },
        null,
        2,
    ),
);
fs.writeFileSync(
    '.tmp/qa-integration-results.json',
    JSON.stringify({ passed: checks.length, checks, testedAt: new Date().toISOString() }, null, 2),
);
console.log(
    'Integration passed: ' + checks.length + '. Preview credentials are in .tmp/qa-seed.json.',
);
