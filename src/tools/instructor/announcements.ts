import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { D2LClient } from '../../api/client.js';
import type { NewsItem } from '../../api/types.js';
import { asPair } from '../../api/richtext.js';
import { consume, stage } from '../../confirm.js';
import { resolveOrgUnitId } from '../courses.js';
import { formatDate, guard, ok } from '../shared.js';
import { requireAuthoring } from './roles.js';

/**
 * Announcements are the one authoring route on this instance that will not
 * accept a plain JSON body — Brightspace wants multipart/mixed with the item
 * metadata as the first part, the same envelope used for file uploads.
 * StartDate is mandatory even when the item is left unpublished.
 */
export function register(server: McpServer, client: D2LClient): void {
  const shape = {
    course: z.union([z.string(), z.number()]).describe('Course id or name fragment.'),
    title: z.string().min(1).describe('Announcement headline.'),
    body: z.string().describe('Body text. HTML is detected and sent as HTML.'),
    publish: z
      .boolean()
      .optional()
      .describe('Publish immediately. Default false — created as a draft.'),
    startDate: z
      .string()
      .optional()
      .describe('ISO date the announcement becomes visible. Defaults to now.'),
    endDate: z.string().optional().describe('ISO date it disappears. Optional.'),
    pinned: z.boolean().optional().describe('Pin to the top of the feed.'),
    confirmToken: z
      .string()
      .optional()
      .describe('Token from the preview step. Omit on the first call.'),
  };

  server.registerTool(
    'create_announcement',
    {
      title: 'Post a course announcement (requires confirmation)',
      description:
        'Creates an announcement in a course you teach. Students may be emailed ' +
        'on publish, so this is two-step: call without confirmToken to get a ' +
        'preview, show it to the user, then call again with the token. Defaults ' +
        'to an unpublished draft.',
      inputSchema: shape,
    },
    async ({ course, title, body, publish, startDate, endDate, pinned, confirmToken }) =>
      guard(async () => {
        if (confirmToken) return ok(await consume('create_announcement', confirmToken));

        const orgUnitId = await resolveOrgUnitId(client, course);
        const role = await requireAuthoring(client, orgUnitId, 'post announcements');

        const start = startDate ?? new Date().toISOString();
        const payload = {
          Title: title,
          Body: asPair(body),
          StartDate: start,
          EndDate: endDate ?? null,
          IsGlobal: false,
          IsPublished: publish ?? false,
          ShowOnlyInCourseOfferings: false,
          IsAuthorInfoShown: true,
          IsPinned: pinned ?? false,
          IsStartDateShown: false,
          SortOrder: null,
        };

        return ok(
          stage(
            'create_announcement',
            {
              course: role.courseName ?? orgUnitId,
              courseId: orgUnitId,
              yourRole: role.role,
              title,
              body,
              visibleFrom: formatDate(start),
              visibleUntil: formatDate(endDate ?? null),
              published: publish ?? false,
              pinned: pinned ?? false,
              warning:
                publish === true
                  ? 'This will be visible to students immediately and may trigger notifications.'
                  : 'Created as an unpublished draft; students will not see it yet.',
            },
            async () => {
              const path = await client.le(`/${orgUnitId}/news/`);
              const created = await client.postMultipart<NewsItem>(path, payload, []);
              return {
                status: 'created',
                announcementId: created?.Id ?? null,
                courseId: orgUnitId,
                title,
                published: publish ?? false,
              };
            },
          ),
        );
      }),
  );

  server.registerTool(
    'delete_announcement',
    {
      title: 'Delete a course announcement (requires confirmation)',
      description:
        'Permanently removes an announcement. Two-step: preview first, then ' +
        'confirm with the token.',
      inputSchema: {
        course: z.union([z.string(), z.number()]).describe('Course id or name fragment.'),
        announcementId: z.number().describe('Id from get_announcements.'),
        confirmToken: z.string().optional(),
      },
    },
    async ({ course, announcementId, confirmToken }) =>
      guard(async () => {
        if (confirmToken) return ok(await consume('delete_announcement', confirmToken));

        const orgUnitId = await resolveOrgUnitId(client, course);
        const role = await requireAuthoring(client, orgUnitId, 'delete announcements');

        const listPath = await client.le(`/${orgUnitId}/news/`);
        const items = await client.get<NewsItem[]>(listPath);
        const target = items.find((i) => i.Id === announcementId);
        if (!target) {
          throw new Error(
            `No announcement ${announcementId} in "${role.courseName ?? orgUnitId}".`,
          );
        }

        return ok(
          stage(
            'delete_announcement',
            {
              course: role.courseName ?? orgUnitId,
              announcementId,
              title: target.Title,
              warning: 'Deletion is permanent and cannot be undone from this tool.',
            },
            async () => {
              const path = await client.le(`/${orgUnitId}/news/${announcementId}`);
              await client.delete(path);
              return { status: 'deleted', announcementId, title: target.Title };
            },
          ),
        );
      }),
  );
}
