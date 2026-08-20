/**
 * End-to-end test through the real MCP protocol path against sandbox 8237.
 * Exercises: role preflight, the confirm-token gate, a real write, a real
 * delete, and the FERPA guard.
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../dist/index.js';

/**
 * Point this at a course you are happy to have objects created and deleted in.
 * It refuses to run without one, so a stray invocation cannot touch a live
 * section.
 */
const SANDBOX = Number(process.env.LAMAKU_SANDBOX ?? process.argv[2]);
if (!Number.isInteger(SANDBOX)) {
  console.error(
    'Set LAMAKU_SANDBOX to a sandbox courseId (or pass it as an argument).\n' +
      'This script creates and deletes real objects in that course.',
  );
  process.exit(2);
}

const { server } = createServer();
const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
const client = new Client({ name: 'e2e', version: '0' }, { capabilities: {} });
await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);

const call = async (name, args) => {
  const res = await client.callTool({ name, arguments: args });
  const text = res.content?.[0]?.text ?? '';
  try {
    return { json: JSON.parse(text), isError: res.isError, text };
  } catch {
    return { json: null, isError: res.isError, text };
  }
};

let failures = 0;
const check = (label, pass, detail = '') => {
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!pass) failures++;
};

console.log('\n1. Role preflight blocks a course you cannot author in');
const nonAuthoring = Number(process.env.LAMAKU_NONAUTHORING_COURSE);
if (Number.isInteger(nonAuthoring)) {
  const blocked = await call('create_content_module', {
    course: nonAuthoring,
    title: '[E2E] should never be created',
  });
  check(
    'non-authoring course refused before any write',
    blocked.isError === true && /cannot create content/i.test(blocked.text),
    blocked.text.slice(0, 90),
  );
} else {
  console.log('  SKIP  set LAMAKU_NONAUTHORING_COURSE to a course you only participate in');
}

console.log('\n2. Preview step does not write');
const preview = await call('create_content_module', {
  course: SANDBOX,
  title: '[E2E] probe module',
  description: 'created by the end-to-end test',
});
check('preview returns confirmation_required', preview.json?.status === 'confirmation_required');
check('preview issues a token', typeof preview.json?.confirmToken === 'string');
check('preview says hidden by default', preview.json?.willDo?.hiddenFromStudents === true);

const before = await call('list_modules', { course: SANDBOX });
const countBefore = before.json?.modules?.length ?? before.json?.count ?? null;

console.log('\n3. Confirm actually writes');
const created = await call('create_content_module', {
  course: SANDBOX,
  title: '[E2E] probe module',
  confirmToken: preview.json.confirmToken,
});
check('module created', created.json?.status === 'created', `id=${created.json?.moduleId}`);
const moduleId = created.json?.moduleId;

console.log('\n4. Token is single-use');
const replay = await call('create_content_module', {
  course: SANDBOX,
  title: '[E2E] probe module',
  confirmToken: preview.json.confirmToken,
});
check('replayed token rejected', replay.isError === true, replay.text.slice(0, 70));

console.log('\n5. Cleanup via delete tool');
const delPreview = await call('delete_content_module', { course: SANDBOX, moduleId });
check('delete previews first', delPreview.json?.status === 'confirmation_required');
const deleted = await call('delete_content_module', {
  course: SANDBOX,
  moduleId,
  confirmToken: delPreview.json?.confirmToken,
});
check('module deleted', deleted.json?.status === 'deleted', `id=${deleted.json?.moduleId}`);

const after = await call('list_modules', { course: SANDBOX });
const countAfter = after.json?.modules?.length ?? after.json?.count ?? null;
check('module count back to baseline', countBefore === countAfter, `${countBefore} -> ${countAfter}`);

console.log('\n6. FERPA guard on discussion authors');
// Walks whatever threads the sandbox happens to have rather than pinning ids.
const forums = await call('list_forums', { course: SANDBOX });
let authors = [];
for (const forum of forums.json?.forums ?? []) {
  const topics = await call('list_topics', { course: SANDBOX, forumId: forum.forumId });
  for (const topic of topics.json?.topics ?? []) {
    const posts = await call('read_posts', {
      course: SANDBOX,
      forumId: forum.forumId,
      topicId: topic.topicId,
    });
    authors.push(...(posts.json?.posts ?? []).map((p) => p.author));
  }
}
if (authors.length === 0) {
  console.log('  SKIP  no discussion posts in the sandbox — see scripts/verify-privacy.mjs');
} else {
  check(
    'authors pseudonymised by default',
    authors.every((a) => /^student:[0-9a-f]{6}$|^Anonymous$/.test(a)),
    authors.slice(0, 3).join(', '),
  );
}

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'}\n`);
await client.close();
process.exit(failures === 0 ? 0 : 1);
