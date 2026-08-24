import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildMultipartForm,
  buildMultipartMixed,
  guessMimeType,
} from '../dist/api/multipart.js';

const CRLF = '\r\n';
const part = (data: string) => ({
  filename: 'notes.txt',
  contentType: 'text/plain',
  data: Buffer.from(data, 'utf8'),
});

describe('buildMultipartMixed', () => {
  it('puts the JSON metadata part first, as D2L requires', () => {
    const { body } = buildMultipartMixed({ Title: 'x' }, [part('hello')]);
    const text = body.toString('utf8');
    assert.ok(
      text.indexOf('application/json') < text.indexOf('text/plain'),
      'metadata part must precede the file part',
    );
    assert.match(text, /\{"Title":"x"\}/);
  });

  it("uses D2L's empty name= on the file part", () => {
    // Not a typo. D2L's own examples send name="" and their parser expects it;
    // sending a real name here is rejected.
    const { body } = buildMultipartMixed({}, [part('hello')]);
    assert.match(body.toString('utf8'), /Content-Disposition: form-data; name=""/);
  });

  it('declares the same boundary it actually uses', () => {
    const { body, contentType } = buildMultipartMixed({}, [part('hello')]);
    const boundary = /boundary=(.+)$/.exec(contentType)?.[1];
    assert.ok(boundary, 'contentType must declare a boundary');
    assert.ok(body.toString('utf8').startsWith(`--${boundary}${CRLF}`));
  });

  it('keeps binary payloads byte-exact', () => {
    // A JPEG's leading bytes are not valid UTF-8. Round-tripping the body
    // through a string would corrupt them, so this guards the Buffer path.
    const bytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
    const { body } = buildMultipartMixed({}, [
      { filename: 'p.jpg', contentType: 'image/jpeg', data: bytes },
    ]);
    assert.ok(body.includes(bytes), 'image bytes must survive unaltered');
  });

  it('carries several files in order', () => {
    const { body } = buildMultipartMixed({}, [
      { ...part('one'), filename: 'a.txt' },
      { ...part('two'), filename: 'b.txt' },
    ]);
    const text = body.toString('utf8');
    assert.ok(text.indexOf('a.txt') < text.indexOf('b.txt'));
  });
});

describe('buildMultipartForm', () => {
  it('names the part, unlike the mixed builder', () => {
    // The import route is a normal RFC 7578 upload and wants a real field name.
    const { body } = buildMultipartForm(part('zipdata'), 'file');
    assert.match(body.toString('utf8'), /name="file"; filename="notes.txt"/);
  });

  it('sends no JSON metadata part', () => {
    const { body } = buildMultipartForm(part('zipdata'));
    assert.doesNotMatch(body.toString('utf8'), /application\/json/);
  });

  it('is form-data, not mixed', () => {
    const { contentType } = buildMultipartForm(part('zipdata'));
    assert.match(contentType, /^multipart\/form-data; boundary=/);
  });

  it('terminates with the closing boundary', () => {
    const { body, contentType } = buildMultipartForm(part('zipdata'));
    const boundary = /boundary=(.+)$/.exec(contentType)![1];
    assert.ok(body.toString('utf8').endsWith(`--${boundary}--${CRLF}`));
  });

  it('generates a fresh boundary each call', () => {
    const a = buildMultipartForm(part('x')).contentType;
    const b = buildMultipartForm(part('x')).contentType;
    assert.notEqual(a, b);
  });
});

describe('filename sanitising', () => {
  it('neutralises a CRLF that would otherwise inject a header', () => {
    // Without this, a crafted filename could end the Content-Disposition
    // line and append headers of its own.
    const { body } = buildMultipartForm({
      filename: 'ev"il\r\nX-Injected: yes.txt',
      contentType: 'text/plain',
      data: Buffer.from('x'),
    });
    assert.doesNotMatch(
      body.toString('utf8'),
      /\r\nX-Injected:/,
      'CRLF must not survive into the header',
    );
  });

  it('neutralises a quote that would close the filename early', () => {
    const { body } = buildMultipartForm({
      filename: 'ev"il.txt',
      contentType: 'text/plain',
      data: Buffer.from('x'),
    });
    const line = body.toString('utf8').split(CRLF)[0];
    assert.equal((line.match(/"/g) ?? []).length % 2, 0, 'quotes must stay balanced');
  });

  it('leaves an ordinary filename alone', () => {
    const { body } = buildMultipartForm({
      filename: 'm2-never-skilling.mp4',
      contentType: 'video/mp4',
      data: Buffer.from('x'),
    });
    assert.match(body.toString('utf8'), /filename="m2-never-skilling\.mp4"/);
  });
});

describe('guessMimeType', () => {
  it('maps the document types a submission carries', () => {
    // This map serves assignment submissions and attachments. Course media
    // has its own, stricter map in instructor/media.ts, which rejects an
    // unknown extension rather than falling back — a video sent as
    // octet-stream downloads instead of playing, and only a learner notices.
    assert.equal(guessMimeType('reading.pdf'), 'application/pdf');
    assert.equal(guessMimeType('data.csv'), 'text/csv');
    assert.ok(guessMimeType('essay.docx').startsWith('application/vnd.'));
  });

  it('matches the extension case-insensitively', () => {
    assert.equal(guessMimeType('SLIDE.PNG'), 'image/png');
  });

  it('falls back to octet-stream rather than throwing', () => {
    assert.equal(guessMimeType('mystery.qqq'), 'application/octet-stream');
    assert.equal(guessMimeType('no-extension'), 'application/octet-stream');
  });
});
