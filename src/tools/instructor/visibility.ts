import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { D2LClient } from '../../api/client.js';
import type { ContentModule, ContentTopic } from '../../api/types.js';
import { asInput } from '../../api/richtext.js';
import { consume, stage } from '../../confirm.js';
import { resolveOrgUnitId } from '../courses.js';
import { guard, ok } from '../shared.js';
import { requireAuthoring } from './roles.js';

/**
 * Updating content objects, which is mostly about visibility.
 *
 * Every authoring tool here creates hidden, deliberately — you do not want an
 * agent publishing half a course to students mid-build. But without an update
 * route that meant the last step of every authored course was manual clicking,
 * and it was easy to conclude Brightspace had no unhide route at all. It does:
 * `PUT .../content/modules/{id}` takes a ContentObjectData block and IsHidden
 * is part of it.
 *
 * PUT replaces the object, so every field must be sent. Both tools read the
 * current object first and send it back with the requested changes applied;
 * sending a partial body silently blanks whatever was omitted.
 */

const MODULE = 0;
const TOPIC = 1;

const courseRef = z
  .union([z.string(), z.number()])
  .describe('Course id or name fragment.');

export function register(server: McpServer, client: D2LClient): void {
  server.registerTool(
    'update_content_module',
    {
      title: 'Change a content module: visibility, title, dates, order (requires confirmation)',
      description:
        'Updates a content module in place. The common use is releasing one to ' +
        'students by passing hidden: false, since everything this server creates ' +
        'starts hidden. Omitted fields keep their current values. Two-step: ' +
        'preview, then confirm.',
      inputSchema: {
        course: courseRef,
        moduleId: z.number().describe('Module to update.'),
        hidden: z
          .boolean()
          .optional()
          .describe('false releases the module to students; true hides it again.'),
        title: z.string().min(1).optional().describe('New title.'),
        description: z.string().optional().describe('New description, as HTML.'),
        sortOrder: z
          .number()
          .int()
          .min(0)
          .optional()
          .describe('Ascending position among its siblings. Lower sorts earlier.'),
        dueDate: z.string().optional().describe('ISO due date, or empty string to clear.'),
        startDate: z.string().optional().describe('ISO start date, or empty string to clear.'),
        endDate: z.string().optional().describe('ISO end date, or empty string to clear.'),
        confirmToken: z.string().optional(),
      },
    },
    async ({
      course, moduleId, hidden, title, description, sortOrder,
      dueDate, startDate, endDate, confirmToken,
    }) =>
      guard(async () => {
        if (confirmToken) return ok(await consume('update_content_module', confirmToken));

        const orgUnitId = await resolveOrgUnitId(client, course);
        const role = await requireAuthoring(client, orgUnitId, 'update content');
        const path = await client.le(`/${orgUnitId}/content/modules/${moduleId}`);

        const current = await client.get<ContentModule>(path).catch(() => null);
        if (!current) {
          throw new Error(
            `No content module ${moduleId} in this course. Check the id with list_modules.`,
          );
        }

        // Empty string is an explicit "clear this date"; undefined means leave alone.
        const dateOf = (next: string | undefined, now: string | null | undefined) =>
          next === undefined ? (now ?? null) : next === '' ? null : next;

        const body = {
          Title: title ?? current.Title,
          ShortTitle: current.ShortTitle ?? (title ?? current.Title).slice(0, 50),
          Type: MODULE,
          Description:
            description === undefined ? (current.Description ?? asInput('')) : asInput(description),
          ModuleStartDate: dateOf(startDate, current.ModuleStartDate),
          ModuleEndDate: dateOf(endDate, current.ModuleEndDate),
          ModuleDueDate: dateOf(dueDate, current.ModuleDueDate),
          IsHidden: hidden === undefined ? current.IsHidden : hidden,
          IsLocked: false,
          ...(sortOrder === undefined ? {} : { SortOrder: sortOrder }),
        };

        const changes: string[] = [];
        if (hidden !== undefined && hidden !== current.IsHidden) {
          changes.push(hidden ? 'hidden from students' : 'RELEASED to students');
        }
        if (title !== undefined && title !== current.Title) {
          changes.push(`title -> "${title}"`);
        }
        if (description !== undefined) changes.push('description replaced');
        if (sortOrder !== undefined) changes.push(`sort order -> ${sortOrder}`);
        for (const [label, next] of [
          ['due date', dueDate], ['start date', startDate], ['end date', endDate],
        ] as const) {
          if (next !== undefined) changes.push(next === '' ? `${label} cleared` : `${label} -> ${next}`);
        }

        return ok(
          stage(
            'update_content_module',
            {
              course: role.courseName ?? orgUnitId,
              moduleId,
              title: current.Title,
              currentlyHidden: current.IsHidden,
              changes: changes.length ? changes : ['nothing — every field matches the current value'],
              ...(hidden === false
                ? {
                    warning:
                      'This makes the module visible to enrolled students immediately. ' +
                      'Its topics keep their own visibility, so a released module can ' +
                      'still contain hidden topics.',
                  }
                : {}),
            },
            async () => {
              await client.putJson(path, body);
              return {
                status: 'updated',
                moduleId,
                title: body.Title,
                isHidden: body.IsHidden,
                changed: changes,
              };
            },
          ),
        );
      }),
  );

  server.registerTool(
    'update_content_topic',
    {
      title: 'Change a content topic: visibility, title, order (requires confirmation)',
      description:
        'Updates a topic (a page, uploaded file, or link) in place. Use it to ' +
        'release one to students, rename it, or reorder it. To replace a page\'s ' +
        'HTML use update_content_page instead — this route cannot supply new file ' +
        'data. Two-step: preview, then confirm.',
      inputSchema: {
        course: courseRef,
        topicId: z.number().describe('Topic to update.'),
        hidden: z.boolean().optional().describe('false releases it to students.'),
        title: z.string().min(1).optional().describe('New title.'),
        sortOrder: z.number().int().min(0).optional().describe('Ascending position.'),
        dueDate: z.string().optional().describe('ISO due date, or empty string to clear.'),
        confirmToken: z.string().optional(),
      },
    },
    async ({ course, topicId, hidden, title, sortOrder, dueDate, confirmToken }) =>
      guard(async () => {
        if (confirmToken) return ok(await consume('update_content_topic', confirmToken));

        const orgUnitId = await resolveOrgUnitId(client, course);
        const role = await requireAuthoring(client, orgUnitId, 'update content');
        const path = await client.le(`/${orgUnitId}/content/topics/${topicId}`);

        const current = await client.get<ContentTopic>(path).catch(() => null);
        if (!current) {
          throw new Error(
            `No content topic ${topicId} in this course. Check the id with get_module.`,
          );
        }

        const body = {
          Title: title ?? current.Title,
          ShortTitle: current.ShortTitle ?? (title ?? current.Title).slice(0, 50),
          Type: TOPIC,
          TopicType: current.TopicType,
          Url: current.Url,
          StartDate: current.StartDate ?? null,
          EndDate: current.EndDate ?? null,
          DueDate: dueDate === undefined ? (current.DueDate ?? null) : dueDate === '' ? null : dueDate,
          IsHidden: hidden === undefined ? current.IsHidden : hidden,
          IsLocked: false,
          OpenAsExternalResource:
            (current as { OpenAsExternalResource?: boolean }).OpenAsExternalResource ?? false,
          Description: current.Description ?? asInput(''),
          MajorUpdate: null,
          MajorUpdateText: null,
          ResetCompletionTracking: null,
          ...(sortOrder === undefined ? {} : { SortOrder: sortOrder }),
        };

        const changes: string[] = [];
        if (hidden !== undefined && hidden !== current.IsHidden) {
          changes.push(hidden ? 'hidden from students' : 'RELEASED to students');
        }
        if (title !== undefined && title !== current.Title) changes.push(`title -> "${title}"`);
        if (sortOrder !== undefined) changes.push(`sort order -> ${sortOrder}`);
        if (dueDate !== undefined) {
          changes.push(dueDate === '' ? 'due date cleared' : `due date -> ${dueDate}`);
        }

        return ok(
          stage(
            'update_content_topic',
            {
              course: role.courseName ?? orgUnitId,
              topicId,
              title: current.Title,
              currentlyHidden: current.IsHidden,
              changes: changes.length ? changes : ['nothing — every field matches the current value'],
            },
            async () => {
              await client.putJson(path, body);
              return {
                status: 'updated',
                topicId,
                title: body.Title,
                isHidden: body.IsHidden,
                changed: changes,
              };
            },
          ),
        );
      }),
  );

  server.registerTool(
    'release_course_content',
    {
      title: 'Release every hidden module and topic in a course (requires confirmation)',
      description:
        'Unhides all content in one pass. This is the last step of authoring a ' +
        'course through this server, since everything is created hidden. The ' +
        'preview lists exactly what would become visible, and nothing outside ' +
        'content is touched — quizzes, assignments and discussions keep their own ' +
        'visibility. Two-step: preview, then confirm.',
      inputSchema: {
        course: courseRef,
        confirmToken: z.string().optional(),
      },
    },
    async ({ course, confirmToken }) =>
      guard(async () => {
        if (confirmToken) return ok(await consume('release_course_content', confirmToken));

        const orgUnitId = await resolveOrgUnitId(client, course);
        const role = await requireAuthoring(client, orgUnitId, 'update content');

        const root = await client.get<ContentModule[]>(
          await client.le(`/${orgUnitId}/content/root/`),
        );

        /** Every hidden module and topic, depth first. */
        const hiddenModules: { id: number; title: string }[] = [];
        const hiddenTopics: { id: number; title: string }[] = [];

        const walk = async (mod: ContentModule): Promise<void> => {
          if (mod.IsHidden) hiddenModules.push({ id: mod.Id, title: mod.Title });
          const kids = await client.get<(ContentModule | ContentTopic)[]>(
            await client.le(`/${orgUnitId}/content/modules/${mod.Id}/structure/`),
          );
          for (const kid of kids) {
            if (kid.Type === MODULE) {
              await walk(kid as ContentModule);
            } else if (kid.IsHidden) {
              hiddenTopics.push({ id: kid.Id, title: kid.Title });
            }
          }
        };
        for (const mod of root) await walk(mod);

        const total = hiddenModules.length + hiddenTopics.length;

        return ok(
          stage(
            'release_course_content',
            {
              course: role.courseName ?? orgUnitId,
              courseId: orgUnitId,
              hiddenModules: hiddenModules.length,
              hiddenTopics: hiddenTopics.length,
              willRelease: [
                ...hiddenModules.map((m) => `module: ${m.title}`),
                ...hiddenTopics.map((t) => `topic: ${t.title}`),
              ],
              ...(total === 0
                ? { note: 'Nothing is hidden. This would do nothing.' }
                : {
                    warning:
                      `${total} object(s) become visible to enrolled students ` +
                      `immediately. Check the list above is the whole course and ` +
                      `not a draft you meant to keep back.`,
                  }),
            },
            async () => {
              const released: string[] = [];
              const failed: string[] = [];

              for (const m of hiddenModules) {
                const p = await client.le(`/${orgUnitId}/content/modules/${m.id}`);
                try {
                  const cur = await client.get<ContentModule>(p);
                  await client.putJson(p, {
                    Title: cur.Title,
                    ShortTitle: cur.ShortTitle ?? cur.Title.slice(0, 50),
                    Type: MODULE,
                    Description: cur.Description ?? asInput(''),
                    ModuleStartDate: cur.ModuleStartDate ?? null,
                    ModuleEndDate: cur.ModuleEndDate ?? null,
                    ModuleDueDate: cur.ModuleDueDate ?? null,
                    IsHidden: false,
                    IsLocked: false,
                  });
                  released.push(`module ${m.id}`);
                } catch (e) {
                  failed.push(`module ${m.id}: ${(e as Error).message.slice(0, 90)}`);
                }
              }

              for (const t of hiddenTopics) {
                const p = await client.le(`/${orgUnitId}/content/topics/${t.id}`);
                try {
                  const cur = await client.get<ContentTopic>(p);
                  await client.putJson(p, {
                    Title: cur.Title,
                    ShortTitle: cur.ShortTitle ?? cur.Title.slice(0, 50),
                    Type: TOPIC,
                    TopicType: cur.TopicType,
                    Url: cur.Url,
                    StartDate: cur.StartDate ?? null,
                    EndDate: cur.EndDate ?? null,
                    DueDate: cur.DueDate ?? null,
                    IsHidden: false,
                    IsLocked: false,
                    OpenAsExternalResource:
                      (cur as { OpenAsExternalResource?: boolean })
                        .OpenAsExternalResource ?? false,
                    Description: cur.Description ?? asInput(''),
                    MajorUpdate: null,
                    MajorUpdateText: null,
                    ResetCompletionTracking: null,
                  });
                  released.push(`topic ${t.id}`);
                } catch (e) {
                  failed.push(`topic ${t.id}: ${(e as Error).message.slice(0, 90)}`);
                }
              }

              return {
                status: failed.length ? 'partial' : 'released',
                releasedCount: released.length,
                failedCount: failed.length,
                ...(failed.length ? { failures: failed } : {}),
              };
            },
          ),
        );
      }),
  );
}
