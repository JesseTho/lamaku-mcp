# Security

## Reporting something

Open a [private security advisory](https://github.com/JesseTho/lamaku-mcp/security/advisories/new)
rather than a public issue. If that is not available to you, email jessetho@hawaii.edu.

If the report involves student data that has already been exposed, say so in the first line so
it can be triaged ahead of everything else.

## What this server holds

**A Brightspace session, on your machine.** `lamaku-mcp login` captures session cookies and the
XSRF token after you sign in through the browser, and stores them encrypted with AES-256-GCM
under your user profile:

```
%APPDATA%\lamaku-mcp\session.enc      # Windows
~/Library/Application Support/…       # macOS
~/.config/lamaku-mcp/                 # Linux
```

The key sits beside it in the same directory, written `0600`. **That is obfuscation at rest,
not protection from anything that can already read your user profile.** Anyone with your
account on your machine can decrypt it, exactly as they could read your browser's cookie jar.
Treat the file as equivalent to being logged in.

There is no server, no telemetry, and nothing is sent anywhere except to your Brightspace host.

**Sessions expire.** Roughly a day of idleness, and hard-expiry after a few days. The remedy
for a leaked session is to sign out of Brightspace, which invalidates it immediately, then
`lamaku-mcp login` again.

## What leaves the machine, and where it goes

This server hands data to a language model, which means a vendor's logs. That is the whole
reason the FERPA guard exists.

**Student names, usernames, emails and institutional IDs are protected education records under
FERPA.** By default they never reach the model:

- Students become a stable handle, `student:4f2a91`, an HMAC under a salt generated locally and
  never transmitted. Not reversible, and not comparable across installs.
- The raw `userId` is dropped as well, because it is a direct key back into Brightspace and
  into anything sharing the same institutional ID.
- Course staff are not redacted. A co-instructor's name is not a protected record.
- `revealStudents: true` on a call returns real names, for when you have deliberately asked.

`npm test` covers this, including that an unrecognised role fails closed as a student rather
than open as staff. `node scripts/verify-privacy.mjs` asserts nothing leaks end to end.

**This is a disclosure control, not an access control.** You can read your own roster in
Brightspace whenever you like. The point is keeping it out of prompts and model retention
unless you meant to put it there.

## Writes

Every write is gated twice, and both gates matter:

1. **Role preflight** — refused before the call if your role in that course cannot do it.
2. **Confirmation token** — the first call returns a preview only. Nothing reaches Brightspace
   until you call again with the token. Single use, five-minute expiry, and scoped to the
   action it was minted for, so a token approved for one preview cannot authorise a different
   operation.

New objects are created **hidden from students** by default. `release_course_content` is the
deliberate step that publishes them, and it previews exactly what becomes visible first.

Deletes are permanent and not recoverable through this API. The previews say so, and name what
goes with the object — a forum preview lists every topic that will go with it.

## If you are running this somewhere shared

Don't, without thinking it through. The design assumes one person's machine and one person's
session. On a shared host, anyone with filesystem access to that user profile is you, as far as
Brightspace is concerned.

For anything multi-user, use OAuth (`LAMAKU_AUTH=oauth` with a registered client) rather than
captured session cookies. That path is scaffolded but has not been exercised against a
non-UH instance, so treat it as unproven.

## Scope

In scope: session storage and handling, the FERPA guard, the confirmation gate, injection
through filenames or rich text, and anything that causes a write the user did not approve.

Out of scope: Brightspace's own vulnerabilities (report those to D2L), and the fact that
holding a valid session lets you do what that session can do.
