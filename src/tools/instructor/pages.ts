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

export type PageTemplate = 'uh' | 'jabsom' | 'plain';

/**
 * UH hosts a shared template library on the Lamaku instance itself, and the
 * Course Starter Template builds every page against it. Because it is served
 * from the same origin as course content, an authored page can link it with an
 * absolute path — this is not a CDN dependency, and it is the one exception to
 * keeping a page self-contained.
 *
 * See docs/course-style.md for the component vocabulary these stylesheets
 * provide.
 */
/**
 * JABSOM Design System: Manoa Green headings in Inter, Source Serif 4 for
 * long-form reading. Tokens are inlined rather than linked, because unlike
 * the UH shared library there is no copy of this system hosted on the
 * instance. Inlining also makes a jabsom page render correctly off-instance.
 */
const JABSOM_HEAD = "<link rel=\"stylesheet\" href=\"https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400..700&family=Source+Serif+4:opsz,wght@8..60,400..600&display=swap\"><style>:root{\n--manoa-green:#024731;--kelly-green:#009A44;--ink:#1B2A23;\n--green-900:#022A1E;--green-700:#0A5C3F;--green-600:#0E7A4F;--green-100:#E2F2E8;--green-50:#F1F8F4;\n--neutral-0:#FFFFFF;--neutral-50:#F6F8F6;--neutral-100:#EDF1EE;--neutral-200:#DEE5E0;\n--neutral-300:#C7D1CA;--neutral-500:#74837A;--neutral-600:#566159;--neutral-900:#1B2A23;\n--accent-orange:#AE5E00;--accent-red:#AA0000;\n--font-sans:'Inter',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;\n--font-serif:'Source Serif 4',Georgia,'Times New Roman',serif;\n--sp2:.5rem;--sp3:.75rem;--sp4:1rem;--sp5:1.5rem;--sp6:2rem;--sp7:3rem;\n}\n.jabsom-page{\nfont-family:var(--font-serif);color:var(--ink);background:var(--neutral-0);\nfont-size:1.0625rem;line-height:1.65;margin:0 auto;padding:var(--sp6) var(--sp5) var(--sp7);\nmax-width:68ch;\n}\n.jabsom-page .jabsom-bar{height:6px;background:var(--manoa-green);\nborder-radius:3px;margin-bottom:var(--sp5)}\n.jabsom-page h2{\nfont-family:var(--font-sans);font-weight:600;font-size:2.0625rem;line-height:1.15;\nletter-spacing:-.02em;color:var(--manoa-green);margin:0 0 var(--sp5);text-wrap:balance;\n}\n.jabsom-page h3{\nfont-family:var(--font-sans);font-weight:600;font-size:1.3125rem;line-height:1.25;\ncolor:var(--manoa-green);margin:var(--sp6) 0 var(--sp3);padding-top:var(--sp3);\nborder-top:1px solid var(--neutral-200);text-wrap:balance;\n}\n.jabsom-page h4{font-family:var(--font-sans);font-weight:600;font-size:1.125rem;\ncolor:var(--green-700);margin:var(--sp5) 0 var(--sp2)}\n.jabsom-page p{margin:0 0 var(--sp4);text-wrap:pretty}\n.jabsom-page a{color:var(--green-600);text-underline-offset:2px}\n.jabsom-page a:focus-visible{outline:2px solid var(--kelly-green);outline-offset:2px}\n.jabsom-page strong{font-weight:600;color:var(--green-900)}\n.jabsom-page ul,.jabsom-page ol{margin:0 0 var(--sp4);padding-left:1.35rem}\n.jabsom-page li{margin-bottom:var(--sp2)}\n.jabsom-page blockquote{\nmargin:var(--sp5) 0;padding:var(--sp4) var(--sp5);background:var(--green-50);\nborder-left:4px solid var(--kelly-green);border-radius:0 4px 4px 0;\n}\n.jabsom-page blockquote p:last-child{margin-bottom:0}\n.jabsom-page table{border-collapse:collapse;width:100%;font-family:var(--font-sans);\nfont-size:.9375rem;margin:var(--sp4) 0}\n.jabsom-page caption{font-size:.75rem;letter-spacing:.14em;text-transform:uppercase;\nfont-weight:600;color:var(--neutral-600);text-align:left;padding-bottom:var(--sp2)}\n.jabsom-page th,.jabsom-page td{text-align:left;padding:.55rem .8rem;\nborder-bottom:1px solid var(--neutral-200);vertical-align:top}\n.jabsom-page th{font-size:.75rem;letter-spacing:.06em;text-transform:uppercase;\ncolor:var(--neutral-600);font-weight:600;border-bottom:2px solid var(--neutral-300)}\n.jabsom-page .table-wrap{overflow-x:auto}\n.jabsom-page img,.jabsom-page video{max-width:100%;height:auto}\n.jabsom-page iframe{max-width:100%;border:0}\n.jabsom-page code{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.875em;\nbackground:var(--neutral-100);padding:.1em .35em;border-radius:3px}\n.jabsom-page hr{border:0;border-top:1px solid var(--neutral-200);margin:var(--sp6) 0}\n.jabsom-foot{margin-top:var(--sp7);padding-top:var(--sp3);\nborder-top:3px solid var(--manoa-green);font-family:var(--font-sans);\nfont-size:.8125rem;color:var(--neutral-500)}\n@media (prefers-color-scheme:dark){\n.jabsom-page{background:var(--neutral-0)}\n}</style>";
const JABSOM_OPEN = "<div class=\"jabsom-page\"><div class=\"jabsom-bar\" aria-hidden=\"true\"></div>";
const JABSOM_CLOSE = "<div class=\"jabsom-foot\">John A. Burns School of Medicine \u00b7 University of Hawai\u02bbi at M\u0101noa</div></div>";

const UH_ASSETS = '/shared/HTML-Template-Library/_assets';

const UH_STYLESHEETS = [
  `${UH_ASSETS}/thirdpartylib/bootstrap-4.3.1/css/bootstrap.min.css`,
  `${UH_ASSETS}/thirdpartylib/fontawesome-free-5.9.0-web/css/all.min.css`,
  `${UH_ASSETS}/css/styles.min.css`,
  `${UH_ASSETS}/css/SYS_custom.css`,
];

/**
 * Brightspace renders the uploaded file as-is, so it needs to be a complete
 * document. The 'uh' template reproduces the starter template's skeleton:
 * a decorative banner, a `col-sm-10 offset-sm-1` content column that sets the
 * measure, and the seal footer. The banner carries alt="" deliberately — the
 * template's own pages use alt="banner", which announces a word that carries
 * nothing.
 */
function wrapHtml(
  title: string,
  bodyHtml: string,
  template: PageTemplate = 'uh',
): string {
  const head = [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    ...(template === 'uh'
      ? UH_STYLESHEETS.map((href) => `<link rel="stylesheet" href="${href}">`)
      : template === 'jabsom'
        ? [JABSOM_HEAD]
        : []),
    `<title>${escapeHtml(title)}</title>`,
    '</head>',
  ];

  if (template === 'jabsom') {
    return [...head, '<body>', JABSOM_OPEN, bodyHtml, JABSOM_CLOSE,
            '</body>', '</html>'].join(String.fromCharCode(10));
  }

  if (template === 'plain') {
    return [...head, '<body>', bodyHtml, '</body>', '</html>'].join('\n');
  }

  return [
    ...head,
    '<body>',
    '<div class="container-fluid">',
    '<div class="content-wrapper">',
    '<div class="row">',
    '<div class="col-12 banner-img">',
    `<p><img src="${UH_ASSETS}/img/SYS_banner.png" alt=""></p>`,
    '</div>',
    '<div class="col-sm-10 offset-sm-1">',
    bodyHtml,
    '</div>',
    '</div>',
    '<div class="col-12"><footer>',
    `<p><img src="${UH_ASSETS}/img/SYS_seal.png" alt="University of Hawaiʻi seal"></p>`,
    '</footer></div>',
    '</div>',
    '</div>',
    '</body>',
    '</html>',
  ].join('\n');
}

/**
 * Cheap checks against docs/course-style.md. These are reported in the preview
 * rather than enforced, because a deliberate exception is sometimes right and
 * a silent rewrite of someone's markup is not.
 */
function styleWarnings(html: string): string[] {
  const warnings: string[] = [];
  if (/8000db/i.test(html)) {
    warnings.push(
      'Contains an instructor note (#8000db). Those are author guidance and ' +
        'must not appear on a published page.',
    );
  }
  if (/<h1[\s>]/i.test(html)) {
    warnings.push('Contains <h1>. Brightspace owns h1; page titles start at h2.');
  }
  if (/<img(?![^>]*\balt=)/i.test(html)) {
    warnings.push('An <img> has no alt attribute. Decorative images need alt="".');
  }
  if (/<table(?![^>]*class=)/i.test(html) || (/<table/i.test(html) && !/table-responsive/i.test(html))) {
    warnings.push(
      'A <table> is not wrapped in <div class="table-responsive">, so it will ' +
        'break the layout on a narrow screen.',
    );
  }
  if (/<svg/i.test(html) && !/(role="img"|<title|aria-label)/i.test(html)) {
    warnings.push('An inline <svg> has no text alternative (role="img", <title> or aria-label).');
  }
  if (/<iframe(?![^>]*\btitle=)/i.test(html)) {
    warnings.push('An <iframe> has no title attribute.');
  }
  return warnings;
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
        template: z
          .enum(['uh', 'jabsom', 'plain'])
          .optional()
          .describe(
            'Page chrome. "uh" (default) wraps the content in the UH shared ' +
              'template — stylesheets, banner, content column, seal footer — so ' +
              'the page matches other Lamaku courses. "jabsom" uses the JABSOM ' +
              'Design System with its tokens inlined, which also renders ' +
              'correctly off-instance. "plain" emits a bare ' +
              'document with no institutional styling.',
          ),
        dueDate: z.string().optional().describe('ISO due date, if the page is dated.'),
        confirmToken: z.string().optional(),
      },
    },
    async ({ course, moduleId, title, html, hidden, template, dueDate, confirmToken }) =>
      guard(async () => {
        if (confirmToken) return ok(await consume('create_content_page', confirmToken));

        const orgUnitId = await resolveOrgUnitId(client, course);
        const role = await requireAuthoring(client, orgUnitId, 'create content');
        const isHidden = hidden ?? true;
        const chrome = template ?? 'uh';
        const space = await contentSpace(client, orgUnitId);
        const filename = `${slug(title)}.html`;
        const document = wrapHtml(title, html, chrome);

        // Rough proxy for the density limits a course page should respect.
        const words = html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
        const warnings = styleWarnings(html);

        return ok(
          stage(
            'create_content_page',
            {
              course: role.courseName ?? orgUnitId,
              courseId: orgUnitId,
              moduleId,
              title,
              template: chrome,
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
              ...(warnings.length ? { styleWarnings: warnings } : {}),
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
        template: z
          .enum(['uh', 'jabsom', 'plain'])
          .optional()
          .describe('Page chrome, as for create_content_page: uh, jabsom, or plain. Default "uh".'),
        confirmToken: z.string().optional(),
      },
    },
    async ({ course, topicId, html, title, template, confirmToken }) =>
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
        const chrome = template ?? 'uh';
        const words = html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
        const warnings = styleWarnings(html);

        return ok(
          stage(
            'update_content_page',
            {
              course: role.courseName ?? orgUnitId,
              topicId,
              title: newTitle,
              template: chrome,
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
              ...(warnings.length ? { styleWarnings: warnings } : {}),
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
                    data: Buffer.from(wrapHtml(newTitle, html, chrome), "utf8"),
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
