import type { D2LClient } from './client.js';

/**
 * Which features this server can actually use against a given instance.
 *
 * Brightspace gates routes by per-product API version, and an instance only
 * serves up to whatever version its LMS release ships. A route that is missing
 * answers 404 while a route that exists but dislikes your body answers 400 —
 * that difference is the only reliable way to tell "not available here" from
 * "you sent the wrong thing", and it is what the minimums below were checked
 * against.
 *
 * `minVersion` is recorded ONLY where D2L documents one. Everything else is
 * marked `verifiedAt`, meaning it was proven to work by creating and deleting a
 * real object at that version. A blank minimum is not a claim that the feature
 * works everywhere — it means the floor is unknown.
 */
export interface Feature {
  id: string;
  label: string;
  product: 'le' | 'lp';
  /** Documented minimum API version, where D2L states one. */
  minVersion?: string;
  /** Version this was empirically confirmed working at. */
  verifiedAt?: string;
  status: 'verified' | 'documented' | 'unavailable' | 'untested';
  notes?: string;
}

export const FEATURES: Feature[] = [
  {
    id: 'announcements',
    label: 'Announcements — create, delete',
    product: 'le',
    verifiedAt: '1.96',
    status: 'verified',
    notes: 'Requires multipart/mixed, not JSON. StartDate is mandatory.',
  },
  {
    id: 'content',
    label: 'Content modules and link topics',
    product: 'le',
    verifiedAt: '1.96',
    status: 'verified',
  },
  {
    id: 'content-pages',
    label: 'Authored HTML pages as file topics',
    product: 'le',
    verifiedAt: '1.96',
    status: 'verified',
    notes:
      'Multipart upload. Url must sit under /content/enforced/{orgUnitId}-{CourseCode} ' +
      'with spaces stripped, or the call fails with an empty error list.',
  },
  {
    id: 'assignments',
    label: 'Assignment folders and categories',
    product: 'le',
    verifiedAt: '1.96',
    status: 'verified',
    notes:
      'The route most sensitive to role. Restricted variants such as ' +
      'Instructor-Content Copy Only are refused here but pass elsewhere.',
  },
  {
    id: 'grades',
    label: 'Grade items and categories',
    product: 'le',
    verifiedAt: '1.96',
    status: 'verified',
    notes: 'GradeSchemeId must be 0 for course default; null is rejected.',
  },
  {
    id: 'discussions',
    label: 'Discussion forums and topics',
    product: 'le',
    verifiedAt: '1.96',
    status: 'verified',
    notes:
      'A forum wants rich text as {Text, Html}; a topic inside it wants ' +
      '{Content, Type}. RatingType is a string enum, not a number.',
  },
  {
    id: 'checklists',
    label: 'Checklists with categories and items',
    product: 'le',
    verifiedAt: '1.96',
    status: 'verified',
    notes:
      'SortOrder is required and must be >= 1. Sub-routes wrap results in ' +
      '{Objects} while the parent list returns a bare array.',
  },
  {
    id: 'quizzes',
    label: 'Quiz shells — create, delete',
    product: 'le',
    minVersion: '1.82',
    verifiedAt: '1.96',
    status: 'verified',
    notes:
      'Rejects partial bodies: every documented field must be present, and an ' +
      'incomplete payload returns the same opaque error as malformed JSON.',
  },
  {
    id: 'quiz-questions',
    label: 'Quiz questions — create or edit',
    product: 'le',
    status: 'unavailable',
    notes: 'Brightspace exposes GET for questions but no create or update route.',
  },
  {
    id: 'rubric-assessment',
    label: 'Score a student against an existing rubric',
    product: 'le',
    minVersion: '1.93',
    status: 'untested',
    notes:
      'Route answers on 1.96 and accepts assessmentType=Rubric, so it is live. ' +
      'Not yet confirmed end to end for want of a rubric to score against.',
  },
  {
    id: 'rubric-authoring',
    label: 'Create, update or delete rubrics',
    product: 'le',
    minVersion: '1.97',
    status: 'documented',
    notes:
      'Returns 404 below 1.97, so it arrives with a Brightspace upgrade rather ' +
      'than a code change here.',
  },
  {
    id: 'course-creation',
    label: 'Create a course offering',
    product: 'lp',
    status: 'unavailable',
    notes: 'Org-level admin permission, not available to an instructor role.',
  },
];

export interface FeatureReport extends Feature {
  available: boolean | null;
  reason: string;
}

/** Compare "1.96" against "1.97" numerically rather than as strings. */
function atLeast(actual: string, required: string): boolean {
  const a = actual.split('.').map(Number);
  const b = required.split('.').map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x !== y) return x > y;
  }
  return true;
}

export async function checkCapabilities(client: D2LClient): Promise<{
  host: string;
  versions: Record<string, string>;
  features: FeatureReport[];
}> {
  const versions = Object.fromEntries(await client.apiVersions());

  const features = FEATURES.map((feature): FeatureReport => {
    const actual = versions[feature.product];

    if (feature.status === 'unavailable') {
      return { ...feature, available: false, reason: feature.notes ?? 'Not exposed by the API.' };
    }
    if (!actual) {
      return {
        ...feature,
        available: false,
        reason: `This instance does not serve the "${feature.product}" API component.`,
      };
    }
    if (feature.minVersion && !atLeast(actual, feature.minVersion)) {
      return {
        ...feature,
        available: false,
        reason:
          `Needs ${feature.product} ${feature.minVersion}; this instance serves ` +
          `${actual}. It becomes available on the next Brightspace upgrade.`,
      };
    }
    if (feature.status === 'untested') {
      return {
        ...feature,
        available: null,
        reason:
          `Version requirement met (${feature.product} ${actual}), but this has ` +
          `not been confirmed end to end.`,
      };
    }
    return {
      ...feature,
      available: true,
      reason: feature.minVersion
        ? `Needs ${feature.product} ${feature.minVersion}; instance serves ${actual}.`
        : `Verified working at ${feature.product} ${feature.verifiedAt ?? actual}.`,
    };
  });

  return { host: client.host, versions, features };
}
