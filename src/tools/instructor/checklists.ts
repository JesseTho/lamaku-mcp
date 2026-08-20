import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { D2LClient } from '../../api/client.js';
import { asInput } from '../../api/richtext.js';
import { consume, stage } from '../../confirm.js';
import { resolveOrgUnitId } from '../courses.js';
import { formatDate, guard, ok, toText } from '../shared.js';
import { requireAuthoring } from './roles.js';

/**
 * Checklists are three nested objects: a checklist holds categories, and
 * categories hold items. An item's CategoryId is required and cannot be null,
 * so a checklist is only useful once it has at least one category — hence
 * create_checklist can build the whole tree in one call.
 *
 * SortOrder is required on both categories and items and must be >= 1.
 * Omitting it yields the same opaque binding error as sending nothing at all.
 */
interface Checklist {
  ChecklistId: number;
  Name: string;
  Description?: { Text?: string; Html?: string };
}

interface ChecklistCategory {
  CategoryId: number;
  Name: string;
  SortOrder?: number;
}

interface ChecklistItem {
  ChecklistItemId: number;
  CategoryId: number;
  Name: string;
  DueDate: string | null;
  SortOrder?: number;
}

/**
 * The checklist collection comes back as a bare array, but its category and
 * item sub-routes wrap the same data in {Objects, Next}. Normalise rather than
 * trusting either shape.
 */
function unwrap<T>(value: T[] | { Objects?: T[] } | null | undefined): T[] {
  if (Array.isArray(value)) return value;
  return value?.Objects ?? [];
}

export function register(server: McpServer, client: D2LClient): void {
  server.registerTool(
    'list_checklists',
    {
      title: 'List checklists in a course',
      description:
        'Lists course checklists with their categories and items, so you can ' +
        'see the structure before adding to it.',
      inputSchema: {
        course: z.union([z.string(), z.number()]).describe('Course id or name fragment.'),
        expand: z
          .boolean()
          .optional()
          .describe('Fetch categories and items for each checklist. Default true.'),
      },
    },
    async ({ course, expand }) =>
      guard(async () => {
        const orgUnitId = await resolveOrgUnitId(client, course);
        const lists = unwrap(
          await client.get<Checklist[] | { Objects?: Checklist[] }>(
            await client.le(`/${orgUnitId}/checklists/`),
            { cacheSeconds: 300 },
          ),
        );

        if (expand === false) {
          return ok({
            courseId: orgUnitId,
            count: lists.length,
            checklists: lists.map((c) => ({
              checklistId: c.ChecklistId,
              name: c.Name,
              description: toText(c.Description as never),
            })),
          });
        }

        const detailed = [];
        for (const list of lists) {
          const [rawCategories, rawItems] = await Promise.all([
            client
              .get<{ Objects?: ChecklistCategory[] }>(
                await client.le(`/${orgUnitId}/checklists/${list.ChecklistId}/categories/`),
              )
              .catch(() => ({}) as { Objects?: ChecklistCategory[] }),
            client
              .get<{ Objects?: ChecklistItem[] }>(
                await client.le(`/${orgUnitId}/checklists/${list.ChecklistId}/items/`),
              )
              .catch(() => ({}) as { Objects?: ChecklistItem[] }),
          ]);
          const categories = unwrap(rawCategories);
          const items = unwrap(rawItems);

          detailed.push({
            checklistId: list.ChecklistId,
            name: list.Name,
            description: toText(list.Description as never),
            categories: categories.map((cat) => ({
              categoryId: cat.CategoryId,
              name: cat.Name,
              items: items
                .filter((i) => i.CategoryId === cat.CategoryId)
                .map((i) => ({
                  itemId: i.ChecklistItemId,
                  name: i.Name,
                  due: formatDate(i.DueDate),
                })),
            })),
          });
        }

        return ok({ courseId: orgUnitId, count: detailed.length, checklists: detailed });
      }),
  );

  server.registerTool(
    'create_checklist',
    {
      title: 'Create a checklist (requires confirmation)',
      description:
        'Creates a checklist, optionally with categories and items in one call. ' +
        'Items must live inside a category, so passing items without categories ' +
        'is rejected. Two-step: preview, then confirm.',
      inputSchema: {
        course: z.union([z.string(), z.number()]),
        name: z.string().min(1).describe('Checklist name.'),
        description: z.string().optional(),
        displayInCalendar: z.boolean().optional().describe('Default false.'),
        categories: z
          .array(
            z.object({
              name: z.string().min(1),
              description: z.string().optional(),
              items: z
                .array(
                  z.object({
                    name: z.string().min(1),
                    description: z.string().optional(),
                    dueDate: z.string().optional().describe('ISO due date.'),
                  }),
                )
                .optional(),
            }),
          )
          .optional()
          .describe('Categories to create, each with optional items.'),
        confirmToken: z.string().optional(),
      },
    },
    async ({ course, name, description, displayInCalendar, categories, confirmToken }) =>
      guard(async () => {
        if (confirmToken) return ok(await consume('create_checklist', confirmToken));

        const orgUnitId = await resolveOrgUnitId(client, course);
        const role = await requireAuthoring(client, orgUnitId, 'create checklists');

        const categoryCount = categories?.length ?? 0;
        const itemCount = (categories ?? []).reduce(
          (sum, c) => sum + (c.items?.length ?? 0),
          0,
        );

        return ok(
          stage(
            'create_checklist',
            {
              course: role.courseName ?? orgUnitId,
              courseId: orgUnitId,
              yourRole: role.role,
              name,
              categories: categoryCount,
              items: itemCount,
              structure: (categories ?? []).map((c) => ({
                category: c.name,
                items: (c.items ?? []).map((i) => i.name),
              })),
            },
            async () => {
              const checklist = await client.postJson<Checklist>(
                await client.le(`/${orgUnitId}/checklists/`),
                {
                  Name: name,
                  Description: asInput(description ?? ''),
                  DisplayInCalendar: displayInCalendar ?? false,
                },
              );
              const checklistId = checklist?.ChecklistId;
              const created: { category: string; categoryId: number; items: number }[] = [];

              // SortOrder starts at 1 — zero is rejected.
              let categoryOrder = 1;
              for (const cat of categories ?? []) {
                const madeCategory = await client.postJson<ChecklistCategory>(
                  await client.le(`/${orgUnitId}/checklists/${checklistId}/categories/`),
                  {
                    Name: cat.name,
                    Description: asInput(cat.description ?? ''),
                    SortOrder: categoryOrder++,
                  },
                );

                let itemOrder = 1;
                for (const item of cat.items ?? []) {
                  await client.postJson<ChecklistItem>(
                    await client.le(`/${orgUnitId}/checklists/${checklistId}/items/`),
                    {
                      CategoryId: madeCategory.CategoryId,
                      Name: item.name,
                      Description: asInput(item.description ?? ''),
                      SortOrder: itemOrder++,
                      DueDate: item.dueDate ?? null,
                    },
                  );
                }

                created.push({
                  category: cat.name,
                  categoryId: madeCategory.CategoryId,
                  items: cat.items?.length ?? 0,
                });
              }

              return {
                status: 'created',
                checklistId,
                name,
                categories: created,
              };
            },
          ),
        );
      }),
  );

  server.registerTool(
    'add_checklist_item',
    {
      title: 'Add an item to an existing checklist (requires confirmation)',
      description:
        'Adds one item to a category of an existing checklist. Use ' +
        'list_checklists to find the categoryId. Two-step.',
      inputSchema: {
        course: z.union([z.string(), z.number()]),
        checklistId: z.number(),
        categoryId: z.number().describe('Category to add into; items cannot be loose.'),
        name: z.string().min(1),
        description: z.string().optional(),
        dueDate: z.string().optional().describe('ISO due date.'),
        confirmToken: z.string().optional(),
      },
    },
    async ({ course, checklistId, categoryId, name, description, dueDate, confirmToken }) =>
      guard(async () => {
        if (confirmToken) return ok(await consume('add_checklist_item', confirmToken));

        const orgUnitId = await resolveOrgUnitId(client, course);
        const role = await requireAuthoring(client, orgUnitId, 'edit checklists');

        // Item SortOrder must be unique-ish and >= 1, so continue the sequence
        // rather than always writing 1 and shuffling the existing order.
        const existing = unwrap(
          await client
            .get<{ Objects?: ChecklistItem[] }>(
              await client.le(`/${orgUnitId}/checklists/${checklistId}/items/`),
            )
            .catch(() => ({}) as { Objects?: ChecklistItem[] }),
        );
        const nextOrder =
          existing.filter((i) => i.CategoryId === categoryId).length + 1;

        return ok(
          stage(
            'add_checklist_item',
            {
              course: role.courseName ?? orgUnitId,
              checklistId,
              categoryId,
              name,
              due: formatDate(dueDate ?? null),
              position: nextOrder,
            },
            async () => {
              const item = await client.postJson<ChecklistItem>(
                await client.le(`/${orgUnitId}/checklists/${checklistId}/items/`),
                {
                  CategoryId: categoryId,
                  Name: name,
                  Description: asInput(description ?? ''),
                  SortOrder: nextOrder,
                  DueDate: dueDate ?? null,
                },
              );
              return {
                status: 'created',
                itemId: item?.ChecklistItemId ?? null,
                checklistId,
                categoryId,
                name,
              };
            },
          ),
        );
      }),
  );

  server.registerTool(
    'delete_checklist',
    {
      title: 'Delete a checklist (requires confirmation)',
      description:
        'Removes a checklist along with all of its categories and items, and any ' +
        'student completion state. Permanent. Two-step.',
      inputSchema: {
        course: z.union([z.string(), z.number()]),
        checklistId: z.number(),
        confirmToken: z.string().optional(),
      },
    },
    async ({ course, checklistId, confirmToken }) =>
      guard(async () => {
        if (confirmToken) return ok(await consume('delete_checklist', confirmToken));

        const orgUnitId = await resolveOrgUnitId(client, course);
        const role = await requireAuthoring(client, orgUnitId, 'delete checklists');
        const path = await client.le(`/${orgUnitId}/checklists/${checklistId}`);
        const list = await client.get<Checklist>(path).catch(() => null);

        return ok(
          stage(
            'delete_checklist',
            {
              course: role.courseName ?? orgUnitId,
              checklistId,
              name: list?.Name ?? '(could not read name)',
              warning:
                'Deletes the checklist AND all categories, items and student ' +
                'completion state. Permanent.',
            },
            async () => {
              await client.delete(path);
              return { status: 'deleted', checklistId, name: list?.Name ?? null };
            },
          ),
        );
      }),
  );
}
