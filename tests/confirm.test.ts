import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { consume, stage } from '../dist/confirm.js';
import { asInput, asPair } from '../dist/api/richtext.js';

/**
 * The confirmation gate is what makes an agent safe to point at a real course.
 * Every property here is load-bearing: single use stops a replayed token from
 * writing twice, and scoping to the action stops a token minted for a preview
 * of one thing authorising another.
 */
describe('confirmation tokens', () => {
  it('returns a preview without performing the action', async () => {
    let ran = false;
    const staged = stage('demo_action', { what: 'a thing' }, async () => {
      ran = true;
      return { status: 'created' };
    });
    assert.equal(staged.status, 'confirmation_required');
    assert.equal(ran, false, 'the effect must not run at preview time');
  });

  it('includes the plan the user is being asked to approve', () => {
    const staged = stage('demo_action', { course: 'Sandbox 2', moduleId: 7 }, async () => ({}));
    assert.equal(staged.willDo.moduleId, 7);
    assert.equal(staged.willDo.course, 'Sandbox 2');
  });

  it('performs the action when confirmed', async () => {
    let ran = false;
    const staged = stage('demo_confirm', { x: 1 }, async () => {
      ran = true;
      return { status: 'created', id: 99 };
    });
    const result = await consume('demo_confirm', staged.confirmToken);
    assert.equal(ran, true);
    assert.equal((result as { id: number }).id, 99);
  });

  it('refuses to spend the same token twice', async () => {
    // Otherwise a retried tool call silently creates a second object.
    let runs = 0;
    const staged = stage('demo_once', {}, async () => {
      runs += 1;
      return {};
    });
    await consume('demo_once', staged.confirmToken);
    await assert.rejects(() => consume('demo_once', staged.confirmToken));
    assert.equal(runs, 1);
  });

  it('refuses a token minted for a different action', async () => {
    // A token approved for a preview of one thing must not authorise another.
    let ran = false;
    const staged = stage('delete_everything', {}, async () => {
      ran = true;
      return {};
    });
    await assert.rejects(() => consume('create_announcement', staged.confirmToken));
    assert.equal(ran, false);
  });

  it('refuses a token it never issued', async () => {
    await assert.rejects(() => consume('demo_action', 'not-a-real-token'));
  });

  it('mints a distinct token per staged action', () => {
    const a = stage('demo_a', {}, async () => ({}));
    const b = stage('demo_b', {}, async () => ({}));
    assert.notEqual(a.confirmToken, b.confirmToken);
  });

  it('tells the caller the token expires', () => {
    const staged = stage('demo_expiry', {}, async () => ({}));
    assert.ok(staged.expiresAt, 'preview must carry an expiry');
    assert.ok(new Date(staged.expiresAt).getTime() > Date.now());
  });
});

/**
 * Rich text is not one shape in Brightspace. A discussion forum wants
 * {Text, Html} while a topic inside that same forum wants {Content, Type},
 * and sending the wrong one yields a bare 400 naming no field. These pin the
 * two shapes so a refactor cannot swap them.
 */
describe('rich text shapes', () => {
  it('asInput produces the {Content, Type} shape', () => {
    const out = asInput('<p>hi</p>') as Record<string, unknown>;
    assert.ok('Content' in out && 'Type' in out);
    assert.equal('Text' in out, false);
  });

  it('asPair produces the {Text, Html} shape', () => {
    const out = asPair('<p>hi</p>') as Record<string, unknown>;
    assert.ok('Text' in out && 'Html' in out);
    assert.equal('Content' in out, false);
  });

  it('both tolerate null and undefined without throwing', () => {
    for (const value of [null, undefined, '']) {
      assert.doesNotThrow(() => asInput(value));
      assert.doesNotThrow(() => asPair(value));
    }
  });

  it('asPair routes HTML to Html and leaves Text null', () => {
    // It does not down-convert. Brightspace renders whichever half is
    // populated, so putting HTML in Text would show the tags to a learner.
    const html = asPair('<p>hello</p>') as { Text: string | null; Html: string | null };
    assert.equal(html.Text, null);
    assert.match(String(html.Html), /<p>hello<\/p>/);
  });

  it('asPair routes plain text to Text and leaves Html null', () => {
    const plain = asPair('hello') as { Text: string | null; Html: string | null };
    assert.equal(plain.Html, null);
    assert.equal(plain.Text, 'hello');
  });
});
