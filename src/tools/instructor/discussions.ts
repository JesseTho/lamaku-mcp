import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { D2LClient } from '../../api/client.js';
import type { Forum } from '../../api/types.js';
import { asInput, asPair } from '../../api/richtext.js';
import { consume, stage } from '../../confirm.js';
import { resolveOrgUnitId } from '../courses.js';
import { guard, ok } from '../shared.js';
import { requireAuthoring } from './roles.js';

/**
 * Forums and the topics inside them disagree about rich text: a forum wants
 * the {Text, Html} pair, while a topic in that same forum wants the
 * {Content, Type} input shape. Both were established by creating real objects
 * against lamaku.hawaii.edu — neither is derivable from the other.
 */
export function register(server: McpServer, client: D2LClient): void {
  server.registerTool(
    'create_discussion_forum',
    {
      title: 'Create a discussion forum (requires confirmation)',
      description:
        'Creates a forum — the container that holds discussion topics. Students ' +
        'post in topics, not forums, so follow this with create_discussion_topic. ' +
        'Two-step: preview, then confirm.',
      inputSchema: {
        course: z.union([z.string(), z.number()]),
        name: z.string().min(1).describe('Forum name.'),
        description: z.string().optional(),
        hidden: z.boolean().optional().describe('Hide from students. Default true.'),
        showDescriptionInTopics: z.boolean().optional(),
        requiresApproval: z
          .boolean()
          .optional()
          .describe('Posts need instructor approval before appearing.'),
        confirmToken: z.string().optional(),
      },
    },
    async ({
      course,
      name,
      description,
      hidden,
      showDescriptionInTopics,
      requiresApproval,
      confirmToken,
    }) =>
      guard(async () => {
        if (confirmToken) {
          return ok(await consume('create_discussion_forum', confirmToken));
        }

        const orgUnitId = await resolveOrgUnitId(client, course);
        const role = await requireAuthoring(client, orgUnitId, 'create discussions');
        const isHidden = hidden ?? true;

        return ok(
          stage(
            'create_discussion_forum',
            {
              course: role.courseName ?? orgUnitId,
              yourRole: role.role,
              name,
              hiddenFromStudents: isHidden,
              note: 'A forum on its own is empty — add a topic before students can post.',
            },
            async () => {
              const created = await client.postJson<Forum>(
                await client.le(`/${orgUnitId}/discussions/forums/`),
                {
                  Name: name,
                  // Forums take the read-side pair shape, unlike topics.
                  Description: asPair(description ?? ''),
                  ShowDescriptionInTopics: showDescriptionInTopics ?? false,
                  AllowAnonymous: false,
                  IsLocked: false,
                  IsHidden: isHidden,
                  RequiresApproval: requiresApproval ?? false,
                  MustPostToParticipate: false,
                },
              );
              return {
                status: 'created',
                forumId: created?.ForumId ?? null,
                name,
                hidden: isHidden,
              };
            },
          ),
        );
      }),
  );

  server.registerTool(
    'create_discussion_topic',
    {
      title: 'Create a discussion topic (requires confirmation)',
      description:
        'Creates a topic inside a forum — this is what students actually post ' +
        'into. Can be graded by setting scoreOutOf. Two-step.',
      inputSchema: {
        course: z.union([z.string(), z.number()]),
        forumId: z.number().describe('Forum to create the topic in.'),
        name: z.string().min(1),
        description: z.string().optional(),
        hidden: z.boolean().optional().describe('Default true.'),
        scoreOutOf: z.number().positive().optional().describe('Makes the topic graded.'),
        mustPostToParticipate: z
          .boolean()
          .optional()
          .describe('Students must post before seeing others. Default false.'),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        dueDate: z.string().optional(),
        confirmToken: z.string().optional(),
      },
    },
    async (args) =>
      guard(async () => {
        if (args.confirmToken) {
          return ok(await consume('create_discussion_topic', args.confirmToken));
        }

        const orgUnitId = await resolveOrgUnitId(client, args.course);
        const role = await requireAuthoring(client, orgUnitId, 'create discussions');
        const hidden = args.hidden ?? true;

        return ok(
          stage(
            'create_discussion_topic',
            {
              course: role.courseName ?? orgUnitId,
              forumId: args.forumId,
              name: args.name,
              graded: args.scoreOutOf != null ? `out of ${args.scoreOutOf}` : 'ungraded',
              mustPostToParticipate: args.mustPostToParticipate ?? false,
              hiddenFromStudents: hidden,
            },
            async () => {
              const created = await client.postJson<{ TopicId?: number }>(
                await client.le(
                  `/${orgUnitId}/discussions/forums/${args.forumId}/topics/`,
                ),
                {
                  Name: args.name,
                  // Topics take the input shape, unlike their parent forum.
                  Description: asInput(args.description ?? ''),
                  AllowAnonymousPosts: false,
                  StartDate: args.startDate ?? null,
                  EndDate: args.endDate ?? null,
                  IsHidden: hidden,
                  UnlockStartDate: null,
                  UnlockEndDate: null,
                  RequiresApproval: false,
                  ScoreOutOf: args.scoreOutOf ?? null,
                  IsAutoScore: false,
                  IncludeNonScoredValues: false,
                  ScoringType: null,
                  IsLocked: false,
                  MustPostToParticipate: args.mustPostToParticipate ?? false,
                  // RatingType is a string enum, not a number — 0 is rejected.
                  RatingType: null,
                  DisplayInCalendar: Boolean(args.dueDate),
                  DisplayUnlockDatesInCalendar: false,
                  GroupTypeId: null,
                  StartDateAvailabilityType: null,
                  EndDateAvailabilityType: null,
                  DueDate: args.dueDate ?? null,
                },
              );
              return {
                status: 'created',
                topicId: created?.TopicId ?? null,
                forumId: args.forumId,
                name: args.name,
                hidden,
              };
            },
          ),
        );
      }),
  );
}
