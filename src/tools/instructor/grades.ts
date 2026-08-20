import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { D2LClient } from '../../api/client.js';
import { asInput } from '../../api/richtext.js';
import { consume, stage } from '../../confirm.js';
import { resolveOrgUnitId } from '../courses.js';
import { guard, ok } from '../shared.js';
import { requireAuthoring } from './roles.js';

/**
 * "Course default" is GradeSchemeId 0, not null. Passing null is rejected
 * outright with a bare 400, which is a long way from self-evident.
 */
const DEFAULT_SCHEME = 0;

export function register(server: McpServer, client: D2LClient): void {
  server.registerTool(
    'create_grade_item',
    {
      title: 'Create a grade item (requires confirmation)',
      description:
        'Adds a numeric grade item to the gradebook. Two-step: preview, then ' +
        'confirm. Does not enter any student scores.',
      inputSchema: {
        course: z.union([z.string(), z.number()]),
        name: z.string().min(1).describe('Grade item name.'),
        maxPoints: z.number().positive().describe('Points the item is out of.'),
        categoryId: z.number().optional().describe('Grade category to file it under.'),
        description: z.string().optional(),
        weight: z.number().optional().describe('Weight, for weighted gradebooks.'),
        canExceedMax: z.boolean().optional().describe('Allow scores above max.'),
        isBonus: z.boolean().optional(),
        excludeFromFinal: z.boolean().optional(),
        hidden: z.boolean().optional().describe('Hide from students. Default true.'),
        confirmToken: z.string().optional(),
      },
    },
    async (args) =>
      guard(async () => {
        if (args.confirmToken) {
          return ok(await consume('create_grade_item', args.confirmToken));
        }

        const orgUnitId = await resolveOrgUnitId(client, args.course);
        const role = await requireAuthoring(client, orgUnitId, 'edit the gradebook');
        const hidden = args.hidden ?? true;

        return ok(
          stage(
            'create_grade_item',
            {
              course: role.courseName ?? orgUnitId,
              yourRole: role.role,
              name: args.name,
              outOf: args.maxPoints,
              category: args.categoryId ?? 'none',
              hiddenFromStudents: hidden,
              note: 'Creates an empty grade item. No student scores are written.',
            },
            async () => {
              const created = await client.postJson<{ Id?: number }>(
                await client.le(`/${orgUnitId}/grades/`),
                {
                  MaxPoints: args.maxPoints,
                  CanExceedMaxPoints: args.canExceedMax ?? false,
                  IsBonus: args.isBonus ?? false,
                  ExcludeFromFinalGradeCalculation: args.excludeFromFinal ?? false,
                  GradeSchemeId: DEFAULT_SCHEME,
                  Name: args.name,
                  ShortName: args.name.slice(0, 50),
                  GradeType: 'Numeric',
                  CategoryId: args.categoryId ?? null,
                  Description: asInput(args.description ?? ''),
                  Weight: args.weight ?? 0,
                  IsHidden: hidden,
                },
              );
              return {
                status: 'created',
                gradeItemId: created?.Id ?? null,
                name: args.name,
              };
            },
          ),
        );
      }),
  );

  server.registerTool(
    'create_grade_category',
    {
      title: 'Create a grade category (requires confirmation)',
      description: 'Adds a category to group grade items under. Two-step.',
      inputSchema: {
        course: z.union([z.string(), z.number()]),
        name: z.string().min(1),
        weight: z.number().optional(),
        excludeFromFinal: z.boolean().optional(),
        dropLowest: z.number().optional().describe('Number of lowest scores to drop.'),
        confirmToken: z.string().optional(),
      },
    },
    async ({ course, name, weight, excludeFromFinal, dropLowest, confirmToken }) =>
      guard(async () => {
        if (confirmToken) {
          return ok(await consume('create_grade_category', confirmToken));
        }

        const orgUnitId = await resolveOrgUnitId(client, course);
        const role = await requireAuthoring(client, orgUnitId, 'edit the gradebook');

        return ok(
          stage(
            'create_grade_category',
            {
              course: role.courseName ?? orgUnitId,
              name,
              weight: weight ?? 0,
              dropLowest: dropLowest ?? 0,
            },
            async () => {
              const created = await client.postJson<{ Id?: number }>(
                await client.le(`/${orgUnitId}/grades/categories/`),
                {
                  Name: name,
                  ShortName: name.slice(0, 50),
                  CanExceedMax: false,
                  ExcludeFromFinalGrade: excludeFromFinal ?? false,
                  StartDate: null,
                  EndDate: null,
                  Weight: weight ?? 0,
                  MaxPoints: 0,
                  AutoPoints: false,
                  WeightDistributionType: 1,
                  NumberOfHighestToDrop: 0,
                  NumberOfLowestToDrop: dropLowest ?? 0,
                },
              );
              return { status: 'created', categoryId: created?.Id ?? null, name };
            },
          ),
        );
      }),
  );

  server.registerTool(
    'delete_grade_item',
    {
      title: 'Delete a grade item (requires confirmation)',
      description:
        'Removes a grade item and every score recorded against it. Permanent. Two-step.',
      inputSchema: {
        course: z.union([z.string(), z.number()]),
        gradeItemId: z.number(),
        confirmToken: z.string().optional(),
      },
    },
    async ({ course, gradeItemId, confirmToken }) =>
      guard(async () => {
        if (confirmToken) return ok(await consume('delete_grade_item', confirmToken));

        const orgUnitId = await resolveOrgUnitId(client, course);
        const role = await requireAuthoring(client, orgUnitId, 'edit the gradebook');
        const path = await client.le(`/${orgUnitId}/grades/${gradeItemId}`);
        const item = await client.get<{ Name?: string }>(path).catch(() => null);

        return ok(
          stage(
            'delete_grade_item',
            {
              course: role.courseName ?? orgUnitId,
              gradeItemId,
              name: item?.Name ?? '(could not read name)',
              warning:
                'Deletes the item AND all student scores recorded against it. Permanent.',
            },
            async () => {
              await client.delete(path);
              return { status: 'deleted', gradeItemId, name: item?.Name ?? null };
            },
          ),
        );
      }),
  );
}
