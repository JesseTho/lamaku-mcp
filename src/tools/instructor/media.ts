import { readFile, stat } from 'node:fs/promises';
import { basename, extname } from 'node:path';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { D2LClient } from '../../api/client.js';
import { asInput } from '../../api/richtext.js';
import { consume, stage } from '../../confirm.js';
import { resolveOrgUnitId } from '../courses.js';
import { guard, ok } from '../shared.js';
import { requireAuthoring } from './roles.js';

/** Content object discriminators: Type 1 is a topic, TopicType 1 is a file. */
const TOPIC = 1;
const FILE_TOPIC = 1;

/**
 * Brightspace accepts any file on the content-structure route, so the only
 * real limit is what the LMS will stream back. Keep a conservative ceiling:
 * a multipart body is buffered whole in memory on both ends, and a course
 * video past this belongs in Kaltura rather than in course files.
 */
const MAX_BYTES = 512 * 1024 * 1024;

/**
 * Content types Brightspace serves correctly inline. An unknown extension is
 * rejected rather than sent as octet-stream, because a video uploaded with the
 * wrong type downloads instead of playing and the failure only shows up to a
 * learner.
 */
const TYPES: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.m4a': 'audio/mp4',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.opus': 'audio/opus',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.vtt': 'text/vtt',
  '.srt': 'application/x-subrip',
};

/** Same derivation as pages.ts: the content space comes from the course code. */
async function contentSpace(client: D2LClient, orgUnitId: number): Promise<string> {
  const course = await client.get<{ Code?: string; Name?: string }>(
    await client.lp(`/courses/${orgUnitId}`),
    { cacheSeconds: 3600 },
  );
  const code = (course.Code ?? course.Name ?? String(orgUnitId)).replace(/\s+/g, '');
  return `/content/enforced/${orgUnitId}-${code}`;
}

/** Filesystem-safe name, extension preserved. */
function safeName(name: string): string {
  const ext = extname(name).toLowerCase();
  const stem = basename(name, extname(name))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${stem || 'file'}${ext}`;
}

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function register(server: McpServer, client: D2LClient): void {
  server.registerTool(
    'create_content_file',
    {
      title: 'Upload a media or document file into course content (requires confirmation)',
      description:
        'Uploads a local video, audio, image, PDF or caption file into a content ' +
        'module as a file topic. This is what lets a course carry its own media ' +
        'rather than linking out. The uploaded path is returned so an authored ' +
        'page can reference it — upload the media first, then write the page that ' +
        'embeds it. Two-step: preview, then confirm.',
      inputSchema: {
        course: z.union([z.string(), z.number()]).describe('Course id or name fragment.'),
        moduleId: z.number().describe('Module to upload the file into.'),
        filePath: z
          .string()
          .min(1)
          .describe('Absolute path to the local file, on the machine running this server.'),
        title: z
          .string()
          .optional()
          .describe('Topic title shown in the content list. Defaults to the file name.'),
        hidden: z.boolean().optional().describe('Hide from students. Default true.'),
        confirmToken: z.string().optional(),
      },
    },
    async ({ course, moduleId, filePath, title, hidden, confirmToken }) =>
      guard(async () => {
        if (confirmToken) return ok(await consume('create_content_file', confirmToken));

        const info = await stat(filePath).catch(() => null);
        if (!info || !info.isFile()) {
          throw new Error(`No file at ${filePath}`);
        }
        if (info.size > MAX_BYTES) {
          throw new Error(
            `${humanSize(info.size)} exceeds the ${humanSize(MAX_BYTES)} ceiling. ` +
              `Host large video in Kaltura and use create_content_link instead.`,
          );
        }

        const ext = extname(filePath).toLowerCase();
        const contentType = TYPES[ext];
        if (!contentType) {
          throw new Error(
            `Unsupported extension "${ext}". Known: ${Object.keys(TYPES).join(', ')}. ` +
              `Sending an unknown type makes Brightspace download the file rather ` +
              `than play it, which only becomes visible to a learner.`,
          );
        }

        const orgUnitId = await resolveOrgUnitId(client, course);
        const role = await requireAuthoring(client, orgUnitId, 'create content');
        const isHidden = hidden ?? true;
        const space = await contentSpace(client, orgUnitId);
        const filename = safeName(basename(filePath));
        const topicTitle = title ?? basename(filePath);

        const captionHint =
          contentType.startsWith('video/') || contentType.startsWith('audio/')
            ? {
                accessibilityNote:
                  'Media ships with no captions or transcript until someone supplies ' +
                  'them. Upload a .vtt alongside this file, or confirm the page text ' +
                  'covers the same material.',
              }
            : {};

        return ok(
          stage(
            'create_content_file',
            {
              course: role.courseName ?? orgUnitId,
              courseId: orgUnitId,
              moduleId,
              title: topicTitle,
              filename,
              contentType,
              size: humanSize(info.size),
              path: `${space}/${filename}`,
              hiddenFromStudents: isHidden,
              ...captionHint,
            },
            async () => {
              const data = await readFile(filePath);
              const created = await client.postMultipart<{ Id?: number }>(
                await client.le(`/${orgUnitId}/content/modules/${moduleId}/structure/`),
                {
                  Title: topicTitle,
                  ShortTitle: topicTitle.slice(0, 50),
                  Type: TOPIC,
                  TopicType: FILE_TOPIC,
                  Url: `${space}/${filename}`,
                  StartDate: null,
                  EndDate: null,
                  DueDate: null,
                  IsHidden: isHidden,
                  IsLocked: false,
                  OpenAsExternalResource: false,
                  Description: asInput(''),
                  MajorUpdate: null,
                  MajorUpdateText: null,
                  ResetCompletionTracking: null,
                },
                [{ filename, contentType, data }],
              );

              return {
                status: 'created',
                topicId: created?.Id ?? null,
                title: topicTitle,
                path: `${space}/${filename}`,
                contentType,
                size: humanSize(info.size),
                embedAs: contentType.startsWith('video/')
                  ? `<video controls preload="metadata" style="max-width:100%" src="${space}/${filename}"></video>`
                  : contentType.startsWith('audio/')
                    ? `<audio controls preload="metadata" style="width:100%" src="${space}/${filename}"></audio>`
                    : contentType.startsWith('image/')
                      ? `<img src="${space}/${filename}" alt="">`
                      : `<a href="${space}/${filename}">${topicTitle}</a>`,
              };
            },
          ),
        );
      }),
  );
}
