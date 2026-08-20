import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { D2LClient } from '../../api/client.js';
import { asInput } from '../../api/richtext.js';
import { consume, stage } from '../../confirm.js';
import { resolveOrgUnitId } from '../courses.js';
import { formatDate, guard, ok, toText } from '../shared.js';
import { requireAuthoring } from './roles.js';

/**
 * Quiz creation needs le 1.82+ and, unlike most routes here, rejects a partial
 * body: every documented field must be present or the whole request comes back
 * as an opaque "Provided JSON is invalid" with no clue which field is missing.
 * That failure is identical for a nearly-complete payload, for `{}`, and for
 * malformed JSON, so the defaults below are not cosmetic — omitting any of them
 * breaks the call.
 */
interface QuizBlock {
  Text: { Content: string; Type: 'Text' | 'Html' };
  IsDisplayed: boolean;
}

const block = (body: string, displayed = false): QuizBlock => ({
  Text: asInput(body),
  IsDisplayed: displayed,
});

interface QuizSummary {
  QuizId: number;
  Name: string;
  IsActive: boolean;
  StartDate: string | null;
  EndDate: string | null;
  DueDate: string | null;
  GradeItemId: number | null;
  Description?: { Text?: { Text?: string; Html?: string } };
}

export function register(server: McpServer, client: D2LClient): void {
  server.registerTool(
    'list_quizzes',
    {
      title: 'List quizzes in a course',
      description:
        'Lists quizzes with their dates and linked grade items. Reading quiz ' +
        'questions or attempts is not exposed by this tool.',
      inputSchema: {
        course: z.union([z.string(), z.number()]).describe('Course id or name fragment.'),
      },
    },
    async ({ course }) =>
      guard(async () => {
        const orgUnitId = await resolveOrgUnitId(client, course);
        const path = await client.le(`/${orgUnitId}/quizzes/`);
        const raw = await client.get<QuizSummary[] | { Objects: QuizSummary[] }>(path, {
          cacheSeconds: 300,
        });
        const quizzes = Array.isArray(raw) ? raw : (raw.Objects ?? []);

        return ok({
          courseId: orgUnitId,
          count: quizzes.length,
          quizzes: quizzes.map((q) => ({
            quizId: q.QuizId,
            name: q.Name,
            isActive: q.IsActive,
            opens: formatDate(q.StartDate),
            closes: formatDate(q.EndDate),
            due: formatDate(q.DueDate),
            gradeItemId: q.GradeItemId ?? null,
            description: toText(q.Description?.Text as never),
          })),
        });
      }),
  );

  server.registerTool(
    'create_quiz',
    {
      title: 'Create a quiz (requires confirmation)',
      description:
        'Creates a quiz shell in a course. Questions cannot be added through ' +
        'the API — Brightspace exposes no question-creation route — so the quiz ' +
        'is created empty and you add questions in the Lamaku UI. Created ' +
        'inactive by default. Two-step: preview, then confirm.',
      inputSchema: {
        course: z.union([z.string(), z.number()]),
        name: z.string().min(1).describe('Quiz name.'),
        description: z.string().optional().describe('Shown to students before starting.'),
        instructions: z.string().optional().describe('Shown on the quiz itself.'),
        active: z
          .boolean()
          .optional()
          .describe('Make the quiz active/visible. Default false.'),
        startDate: z.string().optional().describe('ISO date the quiz opens.'),
        endDate: z.string().optional().describe('ISO date the quiz closes.'),
        dueDate: z.string().optional().describe('ISO due date.'),
        attemptsAllowed: z.number().int().positive().optional().describe('Default 1.'),
        timeLimitMinutes: z
          .number()
          .int()
          .positive()
          .optional()
          .describe('Enforced time limit. Omit for untimed.'),
        shuffle: z.boolean().optional().describe('Shuffle question order.'),
        allowHints: z.boolean().optional(),
        hideQuestionPoints: z.boolean().optional(),
        preventMovingBackwards: z.boolean().optional(),
        password: z.string().optional().describe('Require a password to start.'),
        categoryId: z.number().optional(),
        confirmToken: z.string().optional(),
      },
    },
    async (args) =>
      guard(async () => {
        if (args.confirmToken) return ok(await consume('create_quiz', args.confirmToken));

        const orgUnitId = await resolveOrgUnitId(client, args.course);
        const role = await requireAuthoring(client, orgUnitId, 'create quizzes');
        const isActive = args.active ?? false;
        const timed = args.timeLimitMinutes != null;

        return ok(
          stage(
            'create_quiz',
            {
              course: role.courseName ?? orgUnitId,
              courseId: orgUnitId,
              yourRole: role.role,
              name: args.name,
              active: isActive,
              opens: formatDate(args.startDate ?? null),
              closes: formatDate(args.endDate ?? null),
              due: formatDate(args.dueDate ?? null),
              attempts: args.attemptsAllowed ?? 1,
              timeLimit: timed ? `${args.timeLimitMinutes} min` : 'untimed',
              note:
                'The quiz is created with NO questions — the API cannot add them. ' +
                'Add questions in Lamaku afterwards.',
              warning: isActive
                ? 'Created ACTIVE. Students may be able to see it immediately.'
                : 'Created inactive; students will not see it yet.',
            },
            async () => {
              const created = await client.postJson<{ QuizId?: number }>(
                await client.le(`/${orgUnitId}/quizzes/`),
                {
                  Name: args.name,
                  IsActive: isActive,
                  SortOrder: 1,
                  AutoExportToGrades: false,
                  GradeItemId: null,
                  IsAutoSetGraded: false,
                  Instructions: block(args.instructions ?? ''),
                  Description: block(args.description ?? '', true),
                  StartDate: args.startDate ?? null,
                  EndDate: args.endDate ?? null,
                  DueDate: args.dueDate ?? null,
                  DisplayInCalendar: Boolean(args.dueDate),
                  NumberOfAttemptsAllowed: args.attemptsAllowed ?? 1,
                  LateSubmissionInfo: {
                    LateSubmissionOption: 0,
                    LateLimitMinutes: null,
                  },
                  SubmissionTimeLimit: {
                    IsEnforced: timed,
                    ShowClock: true,
                    TimeLimitValue: args.timeLimitMinutes ?? 120,
                  },
                  SubmissionGracePeriod: 5,
                  Password: args.password ?? null,
                  Header: block(''),
                  Footer: block(''),
                  AllowHints: args.allowHints ?? false,
                  DisableRightClick: false,
                  DisablePagerAndAlerts: false,
                  NotificationEmail: null,
                  CalcTypeId: 1,
                  RestrictIPAddressRange: null,
                  CategoryId: args.categoryId ?? null,
                  PreventMovingBackwards: args.preventMovingBackwards ?? false,
                  Shuffle: args.shuffle ?? false,
                  AllowOnlyUsersWithSpecialAccess: false,
                  IsRetakeIncorrectOnly: false,
                  PagingTypeId: null,
                  IsSynchronous: false,
                  DeductionPercentage: null,
                  HideQuestionPoints: args.hideQuestionPoints ?? false,
                  IsSingleSession: false,
                },
              );
              return {
                status: 'created',
                quizId: created?.QuizId ?? null,
                name: args.name,
                active: isActive,
                questions: 0,
                next: 'Add questions in the Lamaku UI — the API has no question route.',
              };
            },
          ),
        );
      }),
  );

  server.registerTool(
    'delete_quiz',
    {
      title: 'Delete a quiz (requires confirmation)',
      description:
        'Removes a quiz and every attempt recorded against it. Permanent. Two-step.',
      inputSchema: {
        course: z.union([z.string(), z.number()]),
        quizId: z.number(),
        confirmToken: z.string().optional(),
      },
    },
    async ({ course, quizId, confirmToken }) =>
      guard(async () => {
        if (confirmToken) return ok(await consume('delete_quiz', confirmToken));

        const orgUnitId = await resolveOrgUnitId(client, course);
        const role = await requireAuthoring(client, orgUnitId, 'delete quizzes');
        const quiz = await client
          .get<QuizSummary>(await client.le(`/${orgUnitId}/quizzes/${quizId}`))
          .catch(() => null);

        return ok(
          stage(
            'delete_quiz',
            {
              course: role.courseName ?? orgUnitId,
              quizId,
              name: quiz?.Name ?? '(could not read name)',
              warning:
                'Deletes the quiz AND every student attempt on it. Permanent.',
            },
            async () => {
              await client.delete(await client.le(`/${orgUnitId}/quizzes/${quizId}`));
              return { status: 'deleted', quizId, name: quiz?.Name ?? null };
            },
          ),
        );
      }),
  );
}
