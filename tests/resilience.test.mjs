import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { stdoutExitCode, installProcessGuards } from '../dist/index.js';

const run = promisify(execFile);
// Already a file:// URL on every platform. Taking .pathname and patching the
// leading slash by hand works on Windows and produces a relative path on Linux.
const DIST = new URL('../dist/index.js', import.meta.url).href;

/** Run a snippet in its own process and report how it went. */
async function inChildProcess(source) {
  try {
    const { stdout } = await run(process.execPath, ['--input-type=module', '-e', source]);
    return { exitCode: 0, stdout };
  } catch (error) {
    return { exitCode: error.code ?? 1, stdout: error.stdout ?? '' };
  }
}

describe('stdoutExitCode', () => {
  test('treats EPIPE as an ordinary end', () => {
    assert.equal(stdoutExitCode(Object.assign(new Error('write EPIPE'), { code: 'EPIPE' })), 0);
  });

  test('treats anything else as a failure', () => {
    assert.equal(stdoutExitCode(Object.assign(new Error('nope'), { code: 'ENOSPC' })), 1);
    assert.equal(stdoutExitCode(new Error('no code at all')), 1);
  });
});

describe('installProcessGuards', () => {
  test('registers a handler for the rejection Node would exit on', () => {
    const before = process.listenerCount('unhandledRejection');
    installProcessGuards();
    assert.ok(
      process.listenerCount('unhandledRejection') > before,
      'no unhandledRejection listener was added',
    );
    process.removeAllListeners('unhandledRejection');
    process.removeAllListeners('uncaughtException');
    process.stdout.removeAllListeners('error');
  });
});

/**
 * The regression this file exists for.
 *
 * Node terminates on an unhandled rejection by default. A stdio MCP server
 * dying takes every one of its tools with it for the rest of the client's
 * session, and it does so silently: there is no window to show a crash in, and
 * the client reports the server healthy afterwards because checking it spawns
 * a fresh process.
 *
 * The control case runs first on purpose. Without it this is a test that only
 * asserts today's behaviour; with it, the test shows the guard is the thing
 * making the difference.
 */
describe('a stray rejection does not kill the process', () => {
  const STRAY = `
    Promise.reject(new Error('stray'));
    setTimeout(() => console.log('ALIVE'), 250);
  `;

  test('control: unguarded, Node kills it', async () => {
    const { exitCode, stdout } = await inChildProcess(STRAY);
    assert.notEqual(exitCode, 0, 'expected Node to exit non-zero without a guard');
    assert.ok(!stdout.includes('ALIVE'), 'process was expected to die before the timer ran');
  });

  test('guarded, it keeps running', async () => {
    const { exitCode, stdout } = await inChildProcess(
      `import { installProcessGuards } from ${JSON.stringify(DIST)};\n` +
        `installProcessGuards();\n${STRAY}`,
    );
    assert.equal(exitCode, 0, 'guarded process should exit cleanly');
    assert.ok(stdout.includes('ALIVE'), 'guarded process should have survived to the timer');
  });
});
