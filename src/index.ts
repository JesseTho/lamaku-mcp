#!/usr/bin/env node
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { D2LClient } from './api/client.js';
import { OAuthProvider } from './auth/oauth.js';
import type { AuthProvider } from './auth/provider.js';
import { SessionAuthProvider } from './auth/session.js';
import { AUTH_KIND, HOST } from './config.js';
import * as announcements from './tools/announcements.js';
import * as assignments from './tools/assignments.js';
import * as calendar from './tools/calendar.js';
import * as content from './tools/content.js';
import * as courses from './tools/courses.js';
import * as discussions from './tools/discussions.js';
import * as grades from './tools/grades.js';
import * as instructorAnnouncements from './tools/instructor/announcements.js';
import * as instructorAssignments from './tools/instructor/assignments.js';
import * as instructorChecklists from './tools/instructor/checklists.js';
import * as instructorContent from './tools/instructor/content.js';
import * as instructorDiscussions from './tools/instructor/discussions.js';
import * as instructorGrades from './tools/instructor/grades.js';
import * as instructorPages from './tools/instructor/pages.js';
import * as instructorMedia from './tools/instructor/media.js';
import * as instructorImports from './tools/instructor/imports.js';
import * as instructorVisibility from './tools/instructor/visibility.js';
import * as instructorQuizzes from './tools/instructor/quizzes.js';
import { PRIVACY_MODE } from './privacy.js';

export function createServer(): { server: McpServer; client: D2LClient } {
  const auth: AuthProvider =
    AUTH_KIND === 'oauth' ? new OAuthProvider(HOST) : new SessionAuthProvider(HOST);
  const client = new D2LClient(auth, HOST);

  const server = new McpServer({
    name: 'lamaku-mcp',
    version: '0.1.0',
  });

  courses.register(server, client, auth);
  assignments.register(server, client);
  grades.register(server, client);
  calendar.register(server, client);
  announcements.register(server, client);
  content.register(server, client);
  discussions.register(server, client);

  // Authoring tools. Every one is gated twice: a role preflight before the
  // call, and the confirm-token flow before anything is sent.
  instructorAnnouncements.register(server, client);
  instructorContent.register(server, client);
  instructorAssignments.register(server, client);
  instructorGrades.register(server, client);
  instructorDiscussions.register(server, client);
  instructorQuizzes.register(server, client);
  instructorChecklists.register(server, client);
  instructorPages.register(server, client);
  instructorMedia.register(server, client);
  instructorImports.register(server, client);
  instructorVisibility.register(server, client);

  return { server, client };
}

/**
 * What exit code a stdout write error deserves. EPIPE means the client closed
 * the pipe and went away, which is an ordinary end to a session rather than a
 * failure. Anything else is a real problem. Split out so it can be tested
 * without killing the test runner.
 */
export function stdoutExitCode(error: NodeJS.ErrnoException): number {
  return error.code === 'EPIPE' ? 0 : 1;
}

/**
 * A stdio MCP server dies quietly. There is no window to show a crash in, and
 * the client reports the server as healthy afterwards because checking it
 * spawns a fresh process. So the failure a user actually sees is that every
 * tool vanished, with nothing anywhere saying why.
 *
 * Node terminates on an unhandled rejection by default. One rejected fetch,
 * one timer that settles after a call was abandoned, and all 54 tools go with
 * it for the rest of that session. That trade is wrong for this process: log
 * it loudly and keep serving.
 *
 * An uncaught exception still exits, because state may genuinely be corrupt
 * by then, but it exits having said so.
 */
export function installProcessGuards(): void {
  process.on('unhandledRejection', (reason) => {
    console.error('lamaku-mcp: unhandled rejection, still serving:', reason);
  });

  process.on('uncaughtException', (error) => {
    console.error('lamaku-mcp: uncaught exception, shutting down:', error);
    process.exit(1);
  });

  process.stdout.on('error', (error: NodeJS.ErrnoException) => {
    const code = stdoutExitCode(error);
    if (code !== 0) console.error('lamaku-mcp: stdout failed:', error);
    process.exit(code);
  });
}

export async function startServer(): Promise<void> {
  installProcessGuards();
  const { server } = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stdout belongs to the protocol; anything human-readable goes to stderr.
  console.error(
    `lamaku-mcp ready (host=${HOST}, auth=${AUTH_KIND}, ferpa=${PRIVACY_MODE})`,
  );
}

/**
 * Only self-start when run directly (`node dist/index.js`). The CLI imports
 * this module to serve `lamaku-mcp` with no arguments, and must not trigger
 * a second server.
 */
const isEntryPoint =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isEntryPoint) {
  startServer().catch((error) => {
    console.error('lamaku-mcp failed to start:', error);
    process.exit(1);
  });
}
