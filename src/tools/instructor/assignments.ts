import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { D2LClient } from '../../api/client.js';
import type { DropboxFolder } from '../../api/types.js';
import { asInput } from '../../api/richtext.js';
import { consume, stage } from '../../confirm.js';
import { resolveOrgUnitId } from '../courses.js';
import { formatDate, guard, ok } from '../shared.js';
import { requireAuthoring } from './roles.js';

/**
 * Assignment folders are the route most sensitive to role: a restricted
 * variant such as "Instructor-Content Copy Only" is refused here with a 403
 * even though it passes on announcements and content. requireAuthoring catches
 * that before the call goes out.
 */
export function register(server: McpServer, client: D2LClient): void {
  server.registerTool(
    'create_assignment',
    {
      title: 'Create an assignment folder (requires confirmation)',
      description:
        'Creates an assignment (dropbox folder) students can submit to. ' +
        'Optionally attaches an existing rubric by id — rubrics themselves ' +
        'cannot be created through the API and must already exist in the course. ' +
        'Two-step: preview, then confirm.',
      inputSchema: {
        course: z.union([z.string(), z.number()]),
        name: z.string().min(1).describe('Assignment name.'),
        instructions: z.string().optional().describe('Instructions shown to students.'),
        outOf: z.number().positive().optional().describe('Points the assignment is worth.'),
        dueDate: z.string().optional().describe('ISO due date.'),
        startDate: z.string().optional().describe('ISO date submissions open.'),
        endDate: z.string().optional().describe('ISO date submissions close.'),
        categoryId: z.number().optional().describe('Assignment category id.'),
        rubricIds: z
          .array(z.number())
          .optional()
          .describe('Existing rubric ids to attach. Rubrics cannot be created via API.'),
        hidden: z.boolean().optional().describe('Hide from students. Default true.'),
        confirmToken: z.string().optional(),
      },
    },
    async (args) =>
      guard(async () => {
        if (args.confirmToken) return ok(await consume('create_assignment', args.confirmToken));

        const orgUnitId = await resolveOrgUnitId(client, args.course);
        const role = await requireAuthoring(client, orgUnitId, 'create assignments');
        const hidden = args.hidden ?? true;

        const availability =
          args.startDate || args.endDate
            ? {
                StartDate: args.startDate ?? null,
                EndDate: args.endDate ?? null,
                StartDateAvailabilityType: null,
                EndDateAvailabilityType: null,
              }
            : null;

        return ok(
          stage(
            'create_assignment',
            {
              course: role.courseName ?? orgUnitId,
              courseId: orgUnitId,
              yourRole: role.role,
              name: args.name,
              outOf: args.outOf ?? 'ungraded',
              due: formatDate(args.dueDate ?? null),
              opens: formatDate(args.startDate ?? null),
              closes: formatDate(args.endDate ?? null),
              rubricsAttached: args.rubricIds?.length ?? 0,
              hiddenFromStudents: hidden,
              note: hidden
                ? 'Created hidden; unhide it in Brightspace when ready.'
                : 'Created VISIBLE — students will be able to submit immediately.',
            },
            async () => {
              const created = await client.postJson<DropboxFolder>(
                await client.le(`/${orgUnitId}/dropbox/folders/`),
                {
                  CategoryId: args.categoryId ?? null,
                  Name: args.name,
                  CustomInstructions: asInput(args.instructions ?? ''),
                  Availability: availability,
                  GroupTypeId: null,
                  DueDate: args.dueDate ?? null,
                  DisplayInCalendar: Boolean(args.dueDate),
                  NotificationEmail: null,
                  IsHidden: hidden,
                  Assessment:
                    args.outOf == null
                      ? null
                      : {
                          ScoreDenominator: args.outOf,
                          Rubrics: args.rubricIds ?? [],
                        },
                },
              );
              return {
                status: 'created',
                assignmentId: created?.Id ?? null,
                name: args.name,
                hidden,
              };
            },
          ),
        );
      }),
  );

  server.registerTool(
    'create_assignment_category',
    {
      title: 'Create an assignment category (requires confirmation)',
      description: 'Adds a category for grouping assignment folders. Two-step.',
      inputSchema: {
        course: z.union([z.string(), z.number()]),
        name: z.string().min(1),
        confirmToken: z.string().optional(),
      },
    },
    async ({ course, name, confirmToken }) =>
      guard(async () => {
        if (confirmToken) {
          return ok(await consume('create_assignment_category', confirmToken));
        }

        const orgUnitId = await resolveOrgUnitId(client, course);
        const role = await requireAuthoring(client, orgUnitId, 'create assignments');

        return ok(
          stage(
            'create_assignment_category',
            { course: role.courseName ?? orgUnitId, name },
            async () => {
              const created = await client.postJson<{ Id?: number }>(
                await client.le(`/${orgUnitId}/dropbox/categories/`),
                { Name: name },
              );
              return { status: 'created', categoryId: created?.Id ?? null, name };
            },
          ),
        );
      }),
  );

  server.registerTool(
    'delete_assignment',
    {
      title: 'Delete an assignment folder (requires confirmation)',
      description:
        'Removes an assignment folder and any submissions inside it. Permanent. Two-step.',
      inputSchema: {
        course: z.union([z.string(), z.number()]),
        assignmentId: z.number(),
        confirmToken: z.string().optional(),
      },
    },
    async ({ course, assignmentId, confirmToken }) =>
      guard(async () => {
        if (confirmToken) return ok(await consume('delete_assignment', confirmToken));

        const orgUnitId = await resolveOrgUnitId(client, course);
        const role = await requireAuthoring(client, orgUnitId, 'delete assignments');
        const folders = await client
          .get<DropboxFolder[]>(await client.le(`/${orgUnitId}/dropbox/folders/`))
          .catch(() => [] as DropboxFolder[]);
        const target = folders.find((f) => f.Id === assignmentId);

        return ok(
          stage(
            'delete_assignment',
            {
              course: role.courseName ?? orgUnitId,
              assignmentId,
              name: target?.Name ?? '(could not read name)',
              warning:
                'Deletes the folder AND every student submission in it. Permanent.',
            },
            async () => {
              await client.delete(
                await client.le(`/${orgUnitId}/dropbox/folders/${assignmentId}`),
              );
              return { status: 'deleted', assignmentId, name: target?.Name ?? null };
            },
          ),
        );
      }),
  );
}
