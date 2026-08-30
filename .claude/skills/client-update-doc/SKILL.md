---
name: client-update-doc
description: Use when asked to document recent changes for the client with screenshots, for example "make a changelog with screenshots", "document what changed", "screenshot the new feature and explain it simply", or "show the client what we fixed". Produces a published Artifact page with real screenshots from the live admin panel, the changed part boxed in red, and short plain English descriptions with a human tone.
---

# Client update doc

Turns a batch of recent code changes into a single page the user can send to
their client: one entry per change, a real screenshot with the changed part
highlighted in red, and a short, human, non-technical description. No em
dashes and no " - " used as a sentence connector anywhere in the copy. This
was built and proven out in a real session on 2026-08-16, producing
[this page](https://claude.ai/code/artifact/61bcfd45-ca3f-4649-8a58-dff7ae616414)
as a reference example.

## When to use this

The user asks to document, screenshot, or explain recent changes for a
client, in non-technical language. Look at the current conversation and
`git status` / `git diff` to find every change made this session, not just
the most recent one. If the user previously said "you didn't mention all
the changes", that's a strong sign to re-scan the whole session, not just
the last few messages.

## Prerequisites

The Playwright MCP server is configured in this project's `.mcp.json`
(added 2026-08-16). If its tools (`browser_navigate`, `browser_click`,
`browser_type`, `browser_evaluate`, `browser_take_screenshot`, etc.) are not
yet visible, the user needs to restart their Claude Code session once for
the MCP server to connect. Search for them with ToolSearch
(`select:browser_navigate` or similar) before falling back to anything
else.

**If the MCP tools are genuinely unavailable**, fall back to a throwaway
Playwright script: `npm install --no-save playwright` (gitignored,
uninstall with `npm uninstall playwright --no-save` when done), write the
script into `scripts/_tmp-*.mjs` (must live under the project root for
node's module resolution to find `node_modules/playwright`), run it, then
delete it. Never leave temp scripts committed.

## Step 1: List every change, not just the most visible one

Read back through the session (or `git diff` against the last commit) and
write down every distinct change, including ones with no UI to screenshot:
wording tweaks, bug fixes, data cleanups, security fixes, renamed labels.
Each one becomes its own entry on the final page, even the ones that only
get a text description. Skipping the boring ones is the single most common
mistake here, the user has had to ask twice for a complete list before.

## Step 2: Get the app running and logged in

```bash
(npm run dev > /tmp/tourney-dev.log 2>&1 &)
timeout 60 bash -c 'until curl -sf http://localhost:3000 >/dev/null; do sleep 1; done'
```

If `/auth/login` returns 404 right after a fresh start (seen once, caused
by a stale `.next` cache after an unclean shutdown), stop the server,
`rm -rf .next`, and restart.

Login credentials are never stored anywhere in this repo or in this skill.
Ask the user for an admin email and password each time, live in chat, and
never write them to a file that could be committed.

Login form quirks specific to this app:
- Email field: `#email`
- Password field has **no id or name** (it's a custom `PasswordInput`
  component), select it with `input[type="password"]`
- Submit with `button[type="submit"]`, then wait for the URL to leave
  `/auth/login`

## Step 3: Navigate to the change and highlight it

Get the page into the state that shows the change (check a box, open an
edit form, trigger an error, whatever is relevant), then draw a red
callout box around the exact part that changed using `browser_evaluate`.
Do not rely on hand-picked pixel coordinates, compute the box from the
actual element so it stays correct if the layout shifts:

```js
// Smallest element whose text includes `needle` -- robust without a precise selector.
() => {
  const needle = "TEXT TO FIND";
  const all = Array.from(document.querySelectorAll("body *"));
  const matches = all.filter((el) => el.textContent && el.textContent.includes(needle));
  matches.sort((a, b) => {
    const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
    return ra.width * ra.height - rb.width * rb.height;
  });
  const el = matches[0];
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.x, y: r.y, width: r.width, height: r.height };
}
```

For a group of controls (e.g. a checkbox plus the dropdown it reveals),
find the smallest element containing text A, the smallest containing text
B (or a matching `input.placeholder`), then walk both elements' ancestor
paths to find their nearest common ancestor and use its bounding box. Use
the *smallest* matching element at every step, not `.find()`'s first
match, first-match-in-document-order returns the outermost ancestor
instead of the element you actually want (this bug produced a
whole-viewport highlight box the first time).

Then draw the overlay:

```js
(rect) => {
  const pad = 8;
  const div = document.createElement("div");
  div.setAttribute("data-highlight-overlay", "1");
  div.style.position = "fixed";
  div.style.left = rect.x - pad + "px";
  div.style.top = rect.y - pad + "px";
  div.style.width = rect.width + pad * 2 + "px";
  div.style.height = rect.height + pad * 2 + "px";
  div.style.border = "3px solid #ff3b4e";
  div.style.borderRadius = "12px";
  div.style.boxShadow = "0 0 0 3px rgba(255,59,78,0.18), 0 0 22px rgba(255,59,78,0.45)";
  div.style.zIndex = "2147483647";
  div.style.pointerEvents = "none";
  document.body.appendChild(div);
}
```

Screenshot at viewport 1440x900. Remove the overlay
(`document.querySelectorAll('[data-highlight-overlay]').forEach(el => el.remove())`)
before reusing the same page for the next shot.

**Safety**: some flows (triggering a validation error, submitting a form)
are real writes against the live database behind the admin panel the user
gave you credentials for. Think through what actually happens before
running it, an error case that gets rejected before saving is safe to
demo; anything that would actually create or delete real records needs the
same confirm-first caution as any other database write. If a screenshot
would incidentally reveal unrelated pre-existing mess (leftover test data,
other bugs), don't ship that screenshot, mention the finding to the user
in text instead.

## Step 4: Write the copy

- No dashes as a sentence connector anywhere, em dash or otherwise. Use a
  period, "and", or "so" instead. Split into two sentences if needed.
- Short, human, warm tone. Explain what the person will now see or
  experience, not the code.
- Name things the way a user would ("the sidebar menu"), not how the code
  names them ("adminNavItems").
- One heading plus one or two sentences per change is enough. Resist
  adding more.
- Skip the screenshot for backend-only changes (security fixes, data
  cleanup, validation tweaks) and just write the entry as text. Don't
  force a screenshot where there's nothing to see, and don't skip the
  change entirely just because there's nothing to see.

## Step 5: Build and publish

Load the `artifact-design` skill first (this is a memo/changelog, treat it
as the "utilitarian, polished, not over-designed" case, not an editorial
piece). Base64-embed the screenshots directly in the HTML (self-contained
requirement), one `<article>` per change. Publish with the Artifact tool.
Keep the same title and favicon across redeploys of the same round of
changes so re-publishing updates the same link instead of creating a new
one; pick a fresh favicon only when starting an unrelated batch of
changes.

## Step 6: Clean up

Stop anything you started: kill the dev server
(`netstat -ano | grep ':3000' | grep LISTENING` on Windows, then
`taskkill //PID <pid> //F`, or `lsof -ti:3000 | xargs -r kill` on
Linux/macOS), remove any `scripts/_tmp-*` files, and `git status --short`
to confirm nothing stray got left behind before finishing.
