import { readFile, stat } from 'node:fs/promises';
import { basename, extname } from 'node:path';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { D2LClient } from '../../api/client.js';
import { consume, stage } from '../../confirm.js';
import { resolveOrgUnitId } from '../courses.js';
import { guard, ok } from '../shared.js';
import { requireAuthoring } from './roles.js';

/**
 * Course package import. This is the back door for everything Brightspace
 * will not let the API author directly.
 *
 * Quiz questions are the clearest case: `GET` exists for them but there is no
 * create route, so `create_quiz` can only ever produce an empty shell. A
 * Common Cartridge carries QTI, and importing one creates the questions that
 * no API call can. The same trick covers anything else the package format
 * can express.
 *
 * Available from `le 1.82` (LMS 20.25.1). Lamaku serves 1.96, so the
 * client's negotiated version is always high enough.
 */

/** Brightspace caps course package uploads at 2 GB. */
const MAX_BYTES = 2 * 1024 * 1024 * 1024;

const ACCEPTED = new Set(['.zip', '.imscc']);

type ImportStatus =
  | 'UPLOADING'
  | 'PROCESSING'
  | 'PROCESSED'
  | 'IMPORTING'
  | 'IMPORTFAILED'
  | 'COMPLETED';

interface ImportJob {
  JobToken?: string;
  TargetOrgUnitId?: number;
  Status?: ImportStatus;
}

function humanSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** What the status means for someone waiting on it. */
const EXPLAIN: Record<ImportStatus, string> = {
  UPLOADING: 'Brightspace is still receiving the package.',
  PROCESSING: 'Package received; Brightspace is reading its manifest.',
  PROCESSED: 'Manifest understood. The import itself has not started yet.',
  IMPORTING: 'Objects are being created in the course now.',
  IMPORTFAILED:
    'Brightspace rejected the package. The usual causes are a malformed ' +
    'manifest, a resource the manifest references but the zip does not ' +
    'contain, or a package built for a different LMS.',
  COMPLETED: 'Everything in the package now exists in the course.',
};

export function register(server: McpServer, client: D2LClient): void {
  server.registerTool(
    'import_course_package',
    {
      title: 'Import a course package into a course (requires confirmation)',
      description:
        'Uploads an IMS Common Cartridge (.imscc) or Brightspace course package ' +
        '(.zip) and imports it into a course. This is the only way to create ' +
        'quiz questions, because Brightspace exposes no create route for them — ' +
        'a cartridge carries QTI and the import creates the questions from it. ' +
        'Returns a jobToken; poll get_import_status until COMPLETED. Two-step: ' +
        'preview, then confirm.',
      inputSchema: {
        course: z.union([z.string(), z.number()]).describe('Course id or name fragment.'),
        filePath: z
          .string()
          .min(1)
          .describe('Absolute path to the .imscc or .zip package on this machine.'),
        confirmToken: z.string().optional(),
      },
    },
    async ({ course, filePath, confirmToken }) =>
      guard(async () => {
        if (confirmToken) return ok(await consume('import_course_package', confirmToken));

        const info = await stat(filePath).catch(() => null);
        if (!info || !info.isFile()) throw new Error(`No file at ${filePath}`);
        if (info.size > MAX_BYTES) {
          throw new Error(
            `${humanSize(info.size)} exceeds Brightspace's 2 GB package limit.`,
          );
        }
        const ext = extname(filePath).toLowerCase();
        if (!ACCEPTED.has(ext)) {
          throw new Error(
            `Unsupported package "${ext}". Import takes .imscc (Common Cartridge) ` +
              `or .zip (Brightspace course package).`,
          );
        }

        const orgUnitId = await resolveOrgUnitId(client, course);
        const role = await requireAuthoring(client, orgUnitId, 'import course content');

        return ok(
          stage(
            'import_course_package',
            {
              course: role.courseName ?? orgUnitId,
              courseId: orgUnitId,
              package: basename(filePath),
              size: humanSize(info.size),
              warning:
                'Import ADDS to the course. It does not replace what is already ' +
                'there, so importing twice produces two copies of everything. ' +
                'Import into an empty course, or be sure the current contents ' +
                'do not overlap the package.',
            },
            async () => {
              const data = await readFile(filePath);
              const job = await client.postForm<ImportJob>(
                await client.le(`/import/${orgUnitId}/imports/`),
                {
                  filename: basename(filePath),
                  contentType: 'application/zip',
                  data,
                },
              );

              return {
                status: 'created',
                jobToken: job?.JobToken ?? null,
                courseId: orgUnitId,
                package: basename(filePath),
                next:
                  'Poll get_import_status with this jobToken. A course-sized ' +
                  'package usually reaches COMPLETED within a minute or two.',
              };
            },
          ),
        );
      }),
  );

  server.registerTool(
    'get_import_status',
    {
      title: 'Check a course import job',
      description:
        'Reports where an import_course_package job has got to: UPLOADING, ' +
        'PROCESSING, PROCESSED, IMPORTING, IMPORTFAILED or COMPLETED.',
      inputSchema: {
        course: z.union([z.string(), z.number()]).describe('Course id or name fragment.'),
        jobToken: z.string().min(1).describe('Token returned by import_course_package.'),
      },
    },
    async ({ course, jobToken }) =>
      guard(async () => {
        const orgUnitId = await resolveOrgUnitId(client, course);
        const job = await client.get<ImportJob>(
          await client.le(`/import/${orgUnitId}/imports/${jobToken}`),
        );
        const status = job?.Status;
        return ok({
          courseId: orgUnitId,
          jobToken,
          status: status ?? 'unknown',
          meaning: status ? EXPLAIN[status] : 'Brightspace returned no status.',
          done: status === 'COMPLETED' || status === 'IMPORTFAILED',
          succeeded: status === 'COMPLETED',
        });
      }),
  );
}
