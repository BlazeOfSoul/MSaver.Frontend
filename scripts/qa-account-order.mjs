import assert from 'node:assert/strict';
import fs from 'node:fs';
const seed = JSON.parse(fs.readFileSync('.tmp/qa-seed.json', 'utf8'));
const base = 'http://127.0.0.1:4303/api';
let cookies = '';
async function api(
    path,
    method = 'GET',
    body,
    status = path === '/Accounts/order' && method === 'PUT' ? 204 : 200,
) {
    const response = await fetch(base + path, {
        method,
        headers: { 'Content-Type': 'application/json', Cookie: cookies },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    assert.equal(
        response.status,
        status,
        method + ' ' + path + ' ' + (await response.clone().text()),
    );
    const text = await response.text();
    return {
        data: text ? JSON.parse(text) : null,
        cookies: response.headers
            .getSetCookie()
            .map((x) => x.split(';')[0])
            .join('; '),
    };
}
cookies = (await api('/Auth/login', 'POST', { email: seed.email, password: seed.password }))
    .cookies;
const before = (await api('/Accounts?size=100&isArchived=false')).data.items;
const ids = before.map((x) => x.id).reverse();
await api('/Accounts/order', 'PUT', { accountIds: ids });
let after = (await api('/Accounts?size=100&isArchived=false')).data.items;
assert.deepEqual(
    [...after].sort((a, b) => a.sortOrder - b.sortOrder).map((x) => x.id),
    ids,
);
for (const account of after) {
    const original = before.find((x) => x.id === account.id);
    assert.deepEqual({ ...account, sortOrder: null }, { ...original, sortOrder: null });
}
// New authentication session sees persisted positions, without changing the active UI session.
cookies = (await api('/Auth/login', 'POST', { email: seed.email, password: seed.password }))
    .cookies;
assert.deepEqual(
    (await api('/Accounts?size=100')).data.items.map((x) => x.sortOrder),
    after.map((x) => x.sortOrder),
);
await api('/Accounts/order', 'PUT', { accountIds: [ids[0], ids[0]] }, 400);
await api(
    '/Accounts/order',
    'PUT',
    { accountIds: [ids[0], '00000000-0000-0000-0000-000000000001'] },
    400,
);
after = (await api('/Accounts?size=100')).data.items;
assert.deepEqual(
    [...after].sort((a, b) => a.sortOrder - b.sortOrder).map((x) => x.id),
    ids,
);
const created = (
    await api('/Accounts', 'POST', {
        name: 'Archive order test',
        currencyCode: 'BYN',
        color: '#23c78b',
        initialBalance: 0,
    })
).data;
const archiveId = typeof created === 'string' ? created : created.id;
await api('/Accounts/' + archiveId, 'DELETE');
await api('/Accounts/order', 'PUT', { accountIds: [...ids, archiveId] }, 400);
await api('/Accounts/order', 'PUT', { accountIds: [] });
assert.ok(
    (await api('/Accounts?size=100&isArchived=false')).data.items.every(
        (x) => x.sortOrder === null,
    ),
);
console.log(
    'PASS: persisted order, second session, balances unchanged, invalid/foreign/archived IDs rejected, reset.',
);
