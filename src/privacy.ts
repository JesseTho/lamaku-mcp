import { createHmac, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { dataDir } from './config.js';

/**
 * FERPA guard.
 *
 * Student names, usernames, emails and org-defined ids are education records.
 * Every tool result here is about to be handed to a language model and, from
 * there, into a vendor's logs — so identity is stripped by default and the
 * caller has to ask for it deliberately.
 *
 * Students are pseudonymised rather than blanked. A stable handle lets the
 * assistant still reason across calls ("the same student who missed lab 3")
 * without ever learning who that is. The handle is an HMAC under a salt that
 * never leaves this machine, so it is not reversible and not comparable to
 * anyone else's handles.
 *
 * This is a disclosure control, not an access control: the instructor can
 * always read the roster in Brightspace itself. The point is to keep the
 * roster out of prompts, transcripts and model-provider retention by default.
 */

/** Brightspace role ids that are course staff rather than enrolled students. */
const STAFF_ROLE_PATTERN = /instructor|designer|teaching assistant|grader|support staff|administrator/i;

export type PrivacyMode = 'strict' | 'off';

/**
 * `strict` (default) pseudonymises students everywhere.
 * `off` requires an explicit env opt-in and is meant for a instructor working
 * alone who has accepted that names will reach the model.
 */
export const PRIVACY_MODE: PrivacyMode =
  process.env.LAMAKU_FERPA === 'off' ? 'off' : 'strict';

let cachedSalt: Buffer | null = null;

function salt(): Buffer {
  if (cachedSalt) return cachedSalt;
  const path = join(dataDir(), 'pseudonym-salt');
  if (existsSync(path)) {
    cachedSalt = Buffer.from(readFileSync(path, 'utf8'), 'base64');
    return cachedSalt;
  }
  mkdirSync(dirname(path), { recursive: true });
  const fresh = randomBytes(32);
  writeFileSync(path, fresh.toString('base64'), { mode: 0o600 });
  cachedSalt = fresh;
  return fresh;
}

/** Stable, non-reversible per-install handle, e.g. "student:4f2a91". */
export function pseudonym(userId: string | number): string {
  const digest = createHmac('sha256', salt()).update(String(userId)).digest('hex');
  return `student:${digest.slice(0, 6)}`;
}

export function isStaffRole(roleName: string | null | undefined): boolean {
  return roleName ? STAFF_ROLE_PATTERN.test(roleName) : false;
}

export interface PersonInput {
  userId: string | number | null | undefined;
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  email?: string | null;
  orgDefinedId?: string | null;
  roleName?: string | null;
  isStaff?: boolean;
}

export interface Person {
  ref: string;
  role: string | null;
  displayName?: string;
  username?: string;
  email?: string;
  orgDefinedId?: string;
  userId?: string | number;
}

/**
 * Collapse a Brightspace user into something safe to return.
 *
 * Staff are left intact: an instructor's own name and a co-teacher's are not
 * protected education records, and redacting them makes rosters unreadable for
 * no gain. Students are reduced to a handle unless `reveal` is set.
 */
export function person(input: PersonInput, reveal = false): Person {
  const staff = input.isStaff ?? isStaffRole(input.roleName);
  const shouldReveal = reveal || staff || PRIVACY_MODE === 'off';

  const name =
    input.displayName ??
    [input.firstName, input.lastName].filter(Boolean).join(' ') ??
    null;

  if (shouldReveal) {
    return {
      ref: staff ? `staff:${input.userId ?? '?'}` : pseudonym(input.userId ?? '?'),
      role: input.roleName ?? null,
      ...(name ? { displayName: name } : {}),
      ...(input.username ? { username: input.username } : {}),
      ...(input.email ? { email: input.email } : {}),
      ...(input.orgDefinedId ? { orgDefinedId: input.orgDefinedId } : {}),
      ...(input.userId != null ? { userId: input.userId } : {}),
    };
  }

  // Deliberately drops userId too: it is a direct key back into Brightspace
  // and into any other system keyed on the same institutional id.
  return { ref: pseudonym(input.userId ?? '?'), role: input.roleName ?? null };
}

/**
 * Label for the author of a post. Falls back to the pseudonym whenever the
 * name would otherwise be exposed, so a caller can render a thread without
 * ever holding a real name.
 */
export function authorLabel(
  userId: string | number | null | undefined,
  displayName: string | null | undefined,
  reveal = false,
): string {
  if (reveal || PRIVACY_MODE === 'off') return displayName ?? String(userId ?? 'unknown');
  return pseudonym(userId ?? 'unknown');
}

/** Banner attached to any payload that went through redaction. */
export function privacyNote(revealed: boolean, count: number): Record<string, unknown> {
  if (revealed || PRIVACY_MODE === 'off' || count === 0) return {};
  return {
    privacy:
      `${count} student identit${count === 1 ? 'y was' : 'ies were'} replaced with ` +
      `stable pseudonyms (FERPA guard). Handles are consistent across calls, so ` +
      `you can still track an individual. Pass revealStudents:true only if the ` +
      `user explicitly asks to see real names.`,
  };
}

/**
 * Free text written by staff can name students even when the structured fields
 * are clean — feedback like "see me after class, Jordan" is common. This is a
 * best-effort pass over prose, applied only to names we already know about.
 */
export function scrubNames(text: string, names: string[], reveal = false): string {
  if (reveal || PRIVACY_MODE === 'off' || !text) return text;
  let out = text;
  for (const name of names) {
    for (const part of name.split(/\s+/).filter((p) => p.length > 2)) {
      out = out.replace(new RegExp(`\\b${escapeRegex(part)}\\b`, 'gi'), '[student]');
    }
  }
  return out;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
