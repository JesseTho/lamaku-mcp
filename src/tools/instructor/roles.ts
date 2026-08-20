import type { D2LClient } from '../../api/client.js';
import type { MyOrgUnitInfo } from '../../api/types.js';
import { fetchMyCourses } from '../courses.js';

/**
 * Roles that can author course material. Checked before any write so the user
 * gets a straight answer instead of a bare 403 from deep inside Brightspace.
 *
 * The distinction matters on a real account: the same person can hold
 * Instructor on a sandbox, Designer on one section, Teaching Assistant on
 * another, and Participant on a course they are merely enrolled in. A restricted
 * variant such as "Instructor-Content Copy Only" carries the word Instructor but
 * is refused by, for example, the dropbox routes.
 */
const AUTHORING_ROLES = /instructor|designer|teaching assistant|grader|support staff/i;
const RESTRICTED = /content copy only/i;

export interface RoleCheck {
  courseId: number;
  courseName: string | null;
  role: string | null;
  canAuthor: boolean;
  restricted: boolean;
}

export async function checkRole(
  client: D2LClient,
  courseId: number,
): Promise<RoleCheck> {
  const courses = await fetchMyCourses(client, { scope: 'all' });
  const entry = courses.find((c: MyOrgUnitInfo) => c.OrgUnit.Id === courseId);
  const role = entry?.Access?.ClasslistRoleName ?? null;

  return {
    courseId,
    courseName: entry?.OrgUnit.Name ?? null,
    role,
    canAuthor: role ? AUTHORING_ROLES.test(role) : false,
    restricted: role ? RESTRICTED.test(role) : false,
  };
}

export class RolePreflightError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RolePreflightError';
  }
}

/**
 * Throw before spending a write call the role cannot make. Not a security
 * boundary — Brightspace enforces that server-side regardless — just a clearer
 * error than the 403 that would otherwise come back.
 */
export async function requireAuthoring(
  client: D2LClient,
  courseId: number,
  what: string,
): Promise<RoleCheck> {
  const check = await checkRole(client, courseId);

  if (!check.role) {
    throw new RolePreflightError(
      `You have no listed enrolment in course ${courseId}, so ${what} will be refused.`,
    );
  }
  if (!check.canAuthor) {
    throw new RolePreflightError(
      `Your role in "${check.courseName ?? courseId}" is "${check.role}", which ` +
        `cannot ${what}. Authoring needs Instructor, Designer, or Teaching Assistant.`,
    );
  }
  if (check.restricted) {
    throw new RolePreflightError(
      `Your role in "${check.courseName ?? courseId}" is "${check.role}" — a ` +
        `restricted variant that Brightspace refuses for most authoring routes. ` +
        `Ask ITS for full Instructor on this course if you need to ${what}.`,
    );
  }
  return check;
}
