import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { D2LClient } from '../../api/client.js';
import type { ContentModule } from '../../api/types.js';
import { asInput } from '../../api/richtext.js';
import { consume, stage } from '../../confirm.js';
import { resolveOrgUnitId } from '../courses.js';
import { guard, ok } from '../shared.js';
import { requireAuthoring } from './roles.js';

/** Content object type discriminator: 0 = module, 1 = topic. */
const MODULE = 0;
const TOPIC = 1;
/** TopicType 3 is an external link rather than a managed file. */
const LINK_TOPIC = 3;

export function register(server: McpServer, client: D2LClient): void {
  server.registerTool(
    'create_content_module',
    {
      title: 'Create a content module (requires confirmation)',
      description:
        'Adds a module to a course content area. Pass parentModuleId to nest it ' +
        'inside an existing module, or omit it to create at the top level. ' +
        'Two-step: preview, then confirm.',
      inputSchema: {
        course: z.union([z.string(), z.number()]).describe('Course id or name fragment.'),
        title: z.string().min(1).describe('Module title as students will see it.'),
        description: z.string().optional().describe('Optional module description.'),
        parentModuleId: z
          .number()
          .optional()
          .describe('Nest under this module. Omit for a top-level module.'),
        hidden: z
          .boolean()
          .optional()
          .describe('Hide from students. Default true so drafts stay private.'),
        startDate: z.string().optional().describe('ISO availability start.'),
        endDate: z.string().optional().describe('ISO availability end.'),
        dueDate: z.string().optional().describe('ISO due date shown on the module.'),
        confirmToken: z.string().optional(),
      },
    },
    async ({
      course,
      title,
      description,
      parentModuleId,
      hidden,
      startDate,
      endDate,
      dueDate,
      confirmToken,
    }) =>
      guard(async () => {
        if (confirmToken) return ok(await consume('create_content_module', confirmToken));

        const orgUnitId = await resolveOrgUnitId(client, course);
        const role = await requireAuthoring(client, orgUnitId, 'create content');

        const isHidden = hidden ?? true;
        const payload = {
          Title: title,
          ShortTitle: title.slice(0, 50),
          Type: MODULE,
          ModuleStartDate: startDate ?? null,
          ModuleEndDate: endDate ?? null,
          ModuleDueDate: dueDate ?? null,
          IsHidden: isHidden,
          IsLocked: false,
          Description: asInput(description ?? ''),
        };

        return ok(
          stage(
            'create_content_module',
            {
              course: role.courseName ?? orgUnitId,
              courseId: orgUnitId,
              yourRole: role.role,
              title,
              nestedUnder: parentModuleId ?? 'course root',
              hiddenFromStudents: isHidden,
              note: isHidden
                ? 'Created hidden; students will not see it until you unhide it.'
                : 'Created VISIBLE to students immediately.',
            },
            async () => {
              const route =
                parentModuleId == null
                  ? `/${orgUnitId}/content/root/`
                  : `/${orgUnitId}/content/modules/${parentModuleId}/structure/`;
              const created = await client.postJson<ContentModule>(
                await client.le(route),
                payload,
              );
              return {
                status: 'created',
                moduleId: created?.Id ?? null,
                courseId: orgUnitId,
                title,
                hidden: isHidden,
              };
            },
          ),
        );
      }),
  );

  server.registerTool(
    'create_content_link',
    {
      title: 'Add a link topic to a module (requires confirmation)',
      description:
        'Creates a link (URL) topic inside an existing content module. Use this ' +
        'to point students at readings, videos or external tools. Two-step.',
      inputSchema: {
        course: z.union([z.string(), z.number()]),
        moduleId: z.number().describe('Module to add the link into.'),
        title: z.string().min(1),
        url: z.string().url().describe('Destination URL.'),
        hidden: z.boolean().optional().describe('Default true.'),
        confirmToken: z.string().optional(),
      },
    },
    async ({ course, moduleId, title, url, hidden, confirmToken }) =>
      guard(async () => {
        if (confirmToken) return ok(await consume('create_content_link', confirmToken));

        const orgUnitId = await resolveOrgUnitId(client, course);
        const role = await requireAuthoring(client, orgUnitId, 'create content');
        const isHidden = hidden ?? true;

        return ok(
          stage(
            'create_content_link',
            {
              course: role.courseName ?? orgUnitId,
              moduleId,
              title,
              url,
              hiddenFromStudents: isHidden,
            },
            async () => {
              const path = await client.le(
                `/${orgUnitId}/content/modules/${moduleId}/structure/`,
              );
              const created = await client.postJson<{ Id?: number }>(path, {
                Title: title,
                ShortTitle: title.slice(0, 50),
                Type: TOPIC,
                TopicType: LINK_TOPIC,
                Url: url,
                StartDate: null,
                EndDate: null,
                DueDate: null,
                IsHidden: isHidden,
                IsLocked: false,
                OpenAsExternalResource: true,
                Description: asInput(''),
                MajorUpdate: null,
                MajorUpdateText: null,
                ResetCompletionTracking: null,
              });
              return { status: 'created', topicId: created?.Id ?? null, title, url };
            },
          ),
        );
      }),
  );

  server.registerTool(
    'delete_content_module',
    {
      title: 'Delete a content module (requires confirmation)',
      description:
        'Removes a module and everything inside it. Destructive and not ' +
        'recoverable from this tool. Two-step.',
      inputSchema: {
        course: z.union([z.string(), z.number()]),
        moduleId: z.number(),
        confirmToken: z.string().optional(),
      },
    },
    async ({ course, moduleId, confirmToken }) =>
      guard(async () => {
        if (confirmToken) return ok(await consume('delete_content_module', confirmToken));

        const orgUnitId = await resolveOrgUnitId(client, course);
        const role = await requireAuthoring(client, orgUnitId, 'delete content');
        const path = await client.le(`/${orgUnitId}/content/modules/${moduleId}`);
        const contentModule = await client.get<ContentModule>(path).catch(() => null);

        return ok(
          stage(
            'delete_content_module',
            {
              course: role.courseName ?? orgUnitId,
              moduleId,
              title: contentModule?.Title ?? '(could not read title)',
              warning:
                'Deletes the module AND every topic nested inside it. Permanent.',
            },
            async () => {
              await client.delete(path);
              return {
                status: 'deleted',
                moduleId,
                title: contentModule?.Title ?? null,
              };
            },
          ),
        );
      }),
  );
}
