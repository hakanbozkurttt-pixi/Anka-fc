// Katalog dışı talep bildirimleri testleri.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { requestNotices, type RequestRow } from './requestNotices.ts';

const r = (o: Partial<RequestRow>): RequestRow => ({ id: 'r1', request_no: 7, status: 'pending', decided_at: null, ...o });

test('cihazdaki ilk kontrolde eski kararlar için bildirim yok', () => {
  assert.equal(requestNotices([r({ status: 'approved', decided_at: 'T1' })], null).notices.length, 0);
});

test('onaylanınca bir kez bildirim', () => {
  const first = requestNotices([r({ status: 'approved', decided_at: 'T1' })], {});
  assert.equal(first.notices[0].title, 'Talep #7: Onaylandı');
  assert.equal(requestNotices([r({ status: 'approved', decided_at: 'T1' })], first.seen).notices.length, 0);
});

test('reddedilince bildirim; bekleyen talep için bildirim yok', () => {
  const res = requestNotices([r({ status: 'rejected', decided_at: 'T2' }), r({ id: 'r2' })], {});
  assert.deepEqual(res.notices.map((n) => n.title), ['Talep #7: Onaylanmadı']);
});
