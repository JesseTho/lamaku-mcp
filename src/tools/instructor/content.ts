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

        // Confirm the parent exists before staging. Brightspace reports an
        // unknown parent module as `400 {"Errors":[]}` on the POST, which
        // arrives only after the user has approved a preview naming a module
        // that was never there. A preview that cannot be trusted defeats the
        // point of the two-step gate.
        const parent = await client
          .get<{ Title?: string }>(
            await client.le(`/${orgUnitId}/content/modules/${moduleId}`),
          )
          .catch(() => null);
        if (!parent) {
          throw new Error(
            `No content module ${moduleId} in this course. list_modules shows ` +
              `the valid ids. Checked before staging, because Brightspace ` +
              `reports an unknown parent as an empty 400.`,
          );
        }

        return ok(
          stage(
            'create_content_link',
            {
              course: role.courseName ?? orgUnitId,
              moduleId,
              intoModule: parent.Title ?? '(untitled)',
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

  server.registerTool(
    'delete_content_topic',
    {
      title: 'Delete a content topic (requires confirmation)',
      description:
        'Removes a single topic — a page, an uploaded file, or a link — without ' +
        'touching the module around it. Use delete_content_module to remove a ' +
        'module and everything in it. Two-step: preview, then confirm.',
      inputSchema: {
        course: z.union([z.string(), z.number()]).describe('Course id or name fragment.'),
        topicId: z.number().describe('Topic to delete.'),
        confirmToken: z.string().optional(),
      },
    },
    async ({ course, topicId, confirmToken }) =>
      guard(async () => {
        if (confirmToken) return ok(await consume('delete_content_topic', confirmToken));

        const orgUnitId = await resolveOrgUnitId(client, course);
        const role = await requireAuthoring(client, orgUnitId, 'delete content');
        const path = await client.le(`/${orgUnitId}/content/topics/${topicId}`);
        const topic = await client
          .get<{ Title?: string; TopicType?: number; Url?: string | null }>(path)
          .catch(() => null);
        if (!topic) {
          throw new Error(
            `No content topic ${topicId} in this course. get_module lists the ` +
              `topic ids inside a module.`,
          );
        }

        // A managed file topic owns the file behind it; a link topic does not.
        const isManagedFile = topic.TopicType === 1;

        return ok(
          stage(
            'delete_content_topic',
            {
              course: role.courseName ?? orgUnitId,
              topicId,
              title: topic.Title ?? '(untitled)',
              kind: isManagedFile ? 'uploaded file or authored page' : 'link',
              warning: isManagedFile
                ? 'Removes the topic and the file behind it, including any video ' +
                  'or image a page still references. Permanent.'
                : 'Removes the link. The page it points at is untouched.',
            },
            async () => {
              await client.delete(path);
              return { status: 'deleted', topicId, title: topic.Title ?? null };
            },
          ),
        );
      }),
  );

  server.registerTool(
    'set_module_description',
    {
      title: 'Set a module description, with an optional cover image (requires confirmation)',
      description:
        "Rewrites a content module's description. Brightspace renders an image in " +
        'a module description as that module\'s cover image, so this is how a module ' +
        'gets a cover. Upload the image with create_content_file first and pass the ' +
        'path it returns. Two-step: preview, then confirm.',
      inputSchema: {
        course: z.union([z.string(), z.number()]),
        moduleId: z.number().describe('Module whose description is being set.'),
        text: z
          .string()
          .optional()
          .describe('Description text, or HTML. Omit to set only the cover image.'),
        imagePath: z
          .string()
          .optional()
          .describe(
            'Path to an image already in the course content space, as returned by ' +
              'create_content_file. Rendered as the module cover image.',
          ),
        imageAlt: z
          .string()
          .optional()
          .describe(
            'Alt text for the cover image. Pass an empty string for a purely ' +
              'decorative cover; anything carrying meaning needs a description of ' +
              'the meaning rather than of the picture.',
          ),
        confirmToken: z.string().optional(),
      },
    },
    async ({ course, moduleId, text, imagePath, imageAlt, confirmToken }) =>
      guard(async () => {
        if (confirmToken) return ok(await consume('set_module_description', confirmToken));

        const orgUnitId = await resolveOrgUnitId(client, course);
        const role = await requireAuthoring(client, orgUnitId, 'edit content');

        if (text === undefined && imagePath === undefined) {
          throw new Error('Pass text, imagePath, or both. There is nothing to set otherwise.');
        }

        const path = await client.le(`/${orgUnitId}/content/modules/${moduleId}`);
        const current = await client.get<Record<string, unknown> & { Title?: string }>(path);

        const alt = imageAlt ?? '';
        const img = imagePath
          ? `<p><img src="${escapeAttr(imagePath)}" alt="${escapeAttr(alt)}"></p>`
          : '';
        const body = text
          ? /<[a-z][\s\S]*>/i.test(text)
            ? text
            : `<p>${escapeAttr(text)}</p>`
          : '';

        const warnings: string[] = [];
        if (imagePath && imageAlt === undefined) {
          warnings.push(
            'No imageAlt was given, so the image is marked decorative with alt="". ' +
              'That is right for a purely decorative cover and wrong if the image ' +
              'carries information a reader would otherwise miss.',
          );
        }
        if (imagePath && !imagePath.startsWith('/content/enforced/')) {
          warnings.push(
            'imagePath is not a course content path. An image hosted outside the ' +
              'course may not render for students, and will not survive a course copy.',
          );
        }

        return ok(
          stage(
            'set_module_description',
            {
              course: role.courseName ?? orgUnitId,
              moduleId,
              module: current?.Title ?? String(moduleId),
              coverImage: imagePath ?? 'none',
              altText: imagePath ? (alt === '' ? '(decorative)' : alt) : 'not applicable',
              html: `${img}${body}`,
              note: 'Replaces the whole description. Anything currently there is lost.',
              ...(warnings.length ? { warnings } : {}),
            },
            async () => {
              // PUT replaces the object, so the current fields are carried
              // forward and only Description is changed.
              await client.putJson(path, {
                ...current,
                Description: { Content: `${img}${body}`, Type: 'Html' },
              });
              return {
                status: 'created',
                action: 'description set',
                moduleId,
                coverImage: imagePath ?? null,
              };
            },
          ),
        );
      }),
  );
}

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
