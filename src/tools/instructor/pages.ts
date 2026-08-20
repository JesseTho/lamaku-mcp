import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { D2LClient } from '../../api/client.js';
import { checkCapabilities } from '../../api/capabilities.js';
import { asInput } from '../../api/richtext.js';
import { consume, stage } from '../../confirm.js';
import { resolveOrgUnitId } from '../courses.js';
import { guard, ok } from '../shared.js';
import { requireAuthoring } from './roles.js';

/** Content object discriminators: Type 1 is a topic, TopicType 1 is a file. */
const TOPIC = 1;
const FILE_TOPIC = 1;

/**
 * A file topic's Url has to name a real path inside the org unit's content
 * space, which Brightspace derives from the course code: spaces stripped, and
 * prefixed with the org unit id. Getting it wrong returns HTTP 400 with an
 * empty `Errors` array and no other clue, so it is resolved from the course
 * record rather than guessed.
 */
async function contentSpace(client: D2LClient, orgUnitId: number): Promise<string> {
  const course = await client.get<{ Code?: string; Name?: string }>(
    await client.lp(`/courses/${orgUnitId}`),
    { cacheSeconds: 3600 },
  );
  const code = (course.Code ?? course.Name ?? String(orgUnitId)).replace(/\s+/g, '');
  return `/content/enforced/${orgUnitId}-${code}`;
}

/** Filesystem-safe slug for the uploaded file name. */
function slug(title: string): string {
  const cleaned = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return cleaned || 'page';
}

/**
 * Brightspace renders the uploaded file as-is, so it needs to be a complete
 * document. The styling stays deliberately minimal: Brightspace wraps content
 * in its own theme, and heavy page CSS fights it.
 */
function wrapHtml(title: string, bodyHtml: string): string {
  return [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${escapeHtml(title)}</title>`,
    '</head>',
    '<body>',
    bodyHtml,
    '</body>',
    '</html>',
  ].join('\n');
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function register(server: McpServer, client: D2LClient): void {
  server.registerTool(
    'check_capabilities',
    {
      title: 'Check which features this Brightspace instance supports',
      description:
        'Reports the API versions this instance serves and which authoring ' +
        'features are therefore available, with the minimum version each one ' +
        'needs. Call this when a write fails with a 404, or to find out whether ' +
        'a feature is missing permanently or just waiting on an LMS upgrade.',
      inputSchema: {},
    },
    async () =>
      guard(async () => {
        const report = await checkCapabilities(client);
        const available = report.features.filter((f) => f.available === true);
        const blocked = report.features.filter((f) => f.available === false);
        const unknown = report.features.filter((f) => f.available === null);

        return ok({
          host: report.host,
          apiVersions: report.versions,
          summary: {
            available: available.length,
            unavailable: blocked.length,
            unconfirmed: unknown.length,
          },
          features: report.features.map((f) => ({
            id: f.id,
            feature: f.label,
            available: f.available,
            requires: f.minVersion ? `${f.product} ${f.minVersion}` : null,
            reason: f.reason,
            ...(f.notes ? { notes: f.notes } : {}),
          })),
        });
      }),
  );

  server.registerTool(
    'create_content_page',
    {
      title: 'Create an authored HTML page in course content (requires confirmation)',
      description:
        'Uploads an authored HTML page as a file topic inside a content module. ' +
        'This is how you put real teaching content into a course — ' +
        'create_content_link only points at an external URL. Pass the body HTML ' +
        'only; the document wrapper is added for you. Two-step: preview, then confirm.',
      inputSchema: {
        course: z.union([z.string(), z.number()]).describe('Course id or name fragment.'),
        moduleId: z.number().describe('Module to create the page inside.'),
        title: z.string().min(1).describe('Page title, shown in the content list.'),
        html: z
          .string()
          .min(1)
          .describe(
            'Body HTML for the page — headings, paragraphs, lists, tables. Do not ' +
              'include <html>, <head> or <body> tags; they are added automatically.',
          ),
        hidden: z.boolean().optional().describe('Hide from students. Default true.'),
        dueDate: z.string().optional().describe('ISO due date, if the page is dated.'),
        confirmToken: z.string().optional(),
      },
    },
    async ({ course, moduleId, title, html, hidden, dueDate, confirmToken }) =>
      guard(async () => {
        if (confirmToken) return ok(await consume('create_content_page', confirmToken));

        const orgUnitId = await resolveOrgUnitId(client, course);
        const role = await requireAuthoring(client, orgUnitId, 'create content');
        const isHidden = hidden ?? true;
        const space = await contentSpace(client, orgUnitId);
        const filename = `${slug(title)}.html`;
        const document = wrapHtml(title, html);

        // Rough proxy for the density limits a course page should respect.
        const words = html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;

        return ok(
          stage(
            'create_content_page',
            {
              course: role.courseName ?? orgUnitId,
              courseId: orgUnitId,
              moduleId,
              title,
              path: `${space}/${filename}`,
              words,
              hiddenFromStudents: isHidden,
              ...(words > 900
                ? {
                    lengthWarning:
                      `${words} words. Course pages read better under 900, and ` +
                      `under 600 is better still — consider splitting this page.`,
                  }
                : {}),
            },
            async () => {
              const created = await client.postMultipart<{ Id?: number }>(
                await client.le(`/${orgUnitId}/content/modules/${moduleId}/structure/`),
                {
                  Title: title,
                  ShortTitle: title.slice(0, 50),
                  Type: TOPIC,
                  TopicType: FILE_TOPIC,
                  Url: `${space}/${filename}`,
                  StartDate: null,
                  EndDate: null,
                  DueDate: dueDate ?? null,
                  IsHidden: isHidden,
                  IsLocked: false,
                  OpenAsExternalResource: false,
                  Description: asInput(''),
                  MajorUpdate: null,
                  MajorUpdateText: null,
                  ResetCompletionTracking: null,
                },
                [
                  {
                    filename,
                    contentType: 'text/html',
                    data: Buffer.from(document, 'utf8'),
                  },
                ],
              );

              return {
                status: 'created',
                topicId: created?.Id ?? null,
                title,
                path: `${space}/${filename}`,
                words,
              };
            },
          ),
        );
      }),
  );

  server.registerTool(
    'update_content_page',
    {
      title: 'Rewrite an existing content page (requires confirmation)',
      description:
        'Replaces the HTML of a page already in a module, keeping the same ' +
        'topic id, so existing links and completion tracking survive. Use this ' +
        'to revise a page rather than deleting and recreating it. Two-step.',
      inputSchema: {
        course: z.union([z.string(), z.number()]),
        topicId: z.number().describe('Topic id of the page to rewrite.'),
        html: z
          .string()
          .min(1)
          .describe('Replacement body HTML. Do not include <html>/<head>/<body>.'),
        title: z
          .string()
          .optional()
          .describe('New title. Omit to keep the existing one.'),
        confirmToken: z.string().optional(),
      },
    },
    async ({ course, topicId, html, title, confirmToken }) =>
      guard(async () => {
        if (confirmToken) return ok(await consume('update_content_page', confirmToken));

        const orgUnitId = await resolveOrgUnitId(client, course);
        const role = await requireAuthoring(client, orgUnitId, 'edit content');

        const topicPath = await client.le(`/${orgUnitId}/content/topics/${topicId}`);
        const topic = await client.get<{
          Title?: string;
          Url?: string;
          ParentModuleId?: number;
          IsHidden?: boolean;
        }>(topicPath);

        if (!topic?.Url) {
          throw new Error(
            `Topic ${topicId} has no file path, so it is not an authored page. ` +
              `Only file topics created by create_content_page can be rewritten.`,
          );
        }

        const filename = topic.Url.split('/').pop() ?? 'page.html';
        const newTitle = title ?? topic.Title ?? filename;
        const words = html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;

        return ok(
          stage(
            'update_content_page',
            {
              course: role.courseName ?? orgUnitId,
              topicId,
              title: newTitle,
              path: topic.Url,
              words,
              note:
                'The page is rewritten in place. Its topic id does not change, so ' +
                'links to it and any completion tracking survive.',
              ...(words > 900
                ? {
                    lengthWarning:
                      `${words} words. Course pages read better under 900 — ` +
                      `consider splitting this page.`,
                  }
                : {}),
            },
            async () => {
              // Brightspace exposes no route that replaces a topic's file
              // directly; PUT against the topic or its /file child both answer
              // 500. Re-posting a topic at an existing Url does overwrite the
              // file, so the update is done by writing through a throwaway
              // topic and then pruning it. The original topic keeps pointing at
              // the same path and therefore serves the new content.
              const scratch = await client.postMultipart<{ Id?: number }>(
                await client.le(
                  `/${orgUnitId}/content/modules/${topic.ParentModuleId}/structure/`,
                ),
                {
                  Title: `${newTitle} (updating)`,
                  ShortTitle: 'updating',
                  Type: TOPIC,
                  TopicType: FILE_TOPIC,
                  Url: topic.Url,
                  StartDate: null,
                  EndDate: null,
                  DueDate: null,
                  IsHidden: true,
                  IsLocked: false,
                  OpenAsExternalResource: false,
                  Description: asInput(''),
                  MajorUpdate: null,
                  MajorUpdateText: null,
                  ResetCompletionTracking: null,
                },
                [
                  {
                    filename,
                    contentType: 'text/html',
                    data: Buffer.from(wrapHtml(newTitle, html), 'utf8'),
                  },
                ],
              );

              if (scratch?.Id != null) {
                await client.delete(
                  await client.le(`/${orgUnitId}/content/topics/${scratch.Id}`),
                );
              }

              if (title && title !== topic.Title) {
                await client.putJson(topicPath, { ...topic, Title: title });
              }

              return {
                status: 'created',
                action: 'updated',
                topicId,
                title: newTitle,
                path: topic.Url,
                words,
              };
            },
          ),
        );
      }),
  );
}
