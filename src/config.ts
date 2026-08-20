import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

/** Brightspace host. UH Manoa's Lamaku unless overridden. */
export const HOST =
  process.env.LAMAKU_HOST ?? process.env.LAMAKU_HOST ?? 'lamaku.hawaii.edu';

export type AuthKind = 'session' | 'oauth';

export const AUTH_KIND: AuthKind =
  process.env.LAMAKU_AUTH === 'oauth' ? 'oauth' : 'session';

function stateRoot(): string {
  return (
    process.env.APPDATA ??
    (process.platform === 'darwin'
      ? join(homedir(), 'Library', 'Application Support')
      : join(homedir(), '.config'))
  );
}

/**
 * Per-user state directory, outside the repo. Credentials never live in the
 * project tree, so a stray `git add -A` can't leak them.
 *
 * This project began as a fork of mycourses-mcp. If a session was already
 * captured under that name and none exists here yet, keep using it rather than
 * forcing a pointless re-login.
 */
export function dataDir(): string {
  const current = join(stateRoot(), 'lamaku-mcp');
  if (existsSync(join(current, 'session.enc'))) return current;

  // Keyed on the session file rather than the directory: other state (the
  // pseudonym salt, downloads) creates the new directory long before a login
  // does, and testing for the directory alone would strand a live session.
  const legacy = join(stateRoot(), 'mycourses-mcp');
  if (existsSync(join(legacy, 'session.enc'))) return legacy;

  return current;
}

export const sessionFile = () => join(dataDir(), 'session.enc');
export const keyFile = () => join(dataDir(), 'key');
export const browserProfile = () => join(dataDir(), 'browser-profile');
export const downloadDir = () =>
  process.env.LAMAKU_DOWNLOAD_DIR ?? join(dataDir(), 'downloads');

/** Explicit version pins, e.g. LAMAKU_LE_VERSION=1.96. Rarely needed. */
export const versionOverrides: Record<string, string | undefined> = {
  lp: process.env.LAMAKU_LP_VERSION,
  le: process.env.LAMAKU_LE_VERSION,
};
