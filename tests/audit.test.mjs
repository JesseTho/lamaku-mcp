import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { canRetry } from '../dist/api/client.js';
import { safeErrorBody, guard } from '../dist/tools/shared.js';
import { D2LApiError } from '../dist/api/client.js';

/**
 * The retry decision. The case this exists for: a gateway 502/504 does not
 * mean the origin skipped the write, so retrying a POST there can perform the
 * action twice. Reads are free to retry the whole transient family.
 */
describe('canRetry', () => {
  test('reads retry the transient family', () => {
    for (const status of [429, 502, 503, 504]) {
      assert.equal(canRetry('GET', status), true, `GET ${status}`);
      assert.equal(canRetry('HEAD', status), true, `HEAD ${status}`);
    }
  });

  test('writes retry only when Brightspace refused before acting', () => {
    for (const method of ['POST', 'PUT', 'DELETE']) {
      assert.equal(canRetry(method, 429), true, `${method} 429`);
      for (const status of [502, 503, 504]) {
        assert.equal(canRetry(method, status), false, `${method} ${status} must not retry`);
      }
    }
  });

  test('nobody retries a request that is simply wrong', () => {
    for (const method of ['GET', 'POST']) {
      for (const status of [400, 403, 404, 500]) {
        assert.equal(canRetry(method, status), false, `${method} ${status}`);
      }
    }
  });
});

/**
 * Error bodies under the FERPA guard. Everything the guard does applies to
 * successful results; a raw error body is Brightspace output and can carry the
 * identities strict mode withholds. Only D2L's own error fields pass through.
 * (These tests assume the default LAMAKU_FERPA=strict; the runner sets none.)
 */
describe('safeErrorBody', () => {
  test('passes through the D2L error shape', () => {
    const body = JSON.stringify({ Message: 'Invalid dropbox folder.' });
    assert.equal(safeErrorBody(body), 'Invalid dropbox folder.');
  });

  test('collects nested Errors messages', () => {
    const body = JSON.stringify({
      Errors: [{ Message: 'Name is required.' }, { Message: 'Date is invalid.' }],
    });
    assert.equal(safeErrorBody(body), 'Name is required.; Date is invalid.');
  });

  test('withholds a body that carries anything else', () => {
    const leak = JSON.stringify({
      User: { DisplayName: 'Jordan Kealoha', EmailAddress: 'jkealoha@hawaii.edu' },
    });
    const out = safeErrorBody(leak);
    assert.ok(!out.includes('Kealoha'), 'a name passed through the guard');
    assert.ok(!out.includes('hawaii.edu'), 'an email passed through the guard');
    assert.ok(out.includes('withheld'), 'the summary should say the body was withheld');
  });

  test('withholds non-JSON bodies such as an echoed page', () => {
    const out = safeErrorBody('<html>Signed in as Jordan Kealoha</html>');
    assert.ok(!out.includes('Kealoha'));
    assert.ok(out.includes('withheld'));
  });

  test('an empty body stays empty', () => {
    assert.equal(safeErrorBody(''), '');
    assert.equal(safeErrorBody('   '), '');
  });
});

describe('guard', () => {
  test('a failing call reports through safeErrorBody, not raw', async () => {
    const result = await guard(async () => {
      throw new D2LApiError(
        'POST /thing failed with HTTP 400',
        400,
        JSON.stringify({ User: { DisplayName: 'Jordan Kealoha' } }),
        '/thing',
      );
    });
    assert.equal(result.isError, true);
    const text = result.content[0].text;
    assert.ok(!text.includes('Kealoha'), 'guard leaked the raw body');
    assert.ok(text.includes('HTTP 400'), 'the status line should survive');
  });
});
