# WaitAds — Claude Code adapter

The first real agent adapter. Where the web prototype simulates a turn in the
browser, this runs against actual Claude Code sessions: real lifecycle events,
real contextual signals, real placement timing.

## What it does

Claude Code hooks map cleanly onto the normalized event model in `AGENTS.md`:

| Claude Code hook   | Normalized event         | What happens                                |
| ------------------ | ------------------------ | ------------------------------------------- |
| `UserPromptSubmit` | `agent.turn.started`     | Opens the eligibility window                |
| `PreToolUse`       | `agent.activity.updated` | Classifies intent locally into a category   |
| `Stop`             | `agent.turn.completed`   | Closes the placement, scores the impression |

The status line renders one clearly-labeled line **only while a turn is
active**. When the agent is idle, it prints nothing.

## The privacy boundary

This is the part that has to be true, not just claimed.

Raw tool input is read in exactly one place — `classifyToolCall` in
`src/classifier.js` — and only a category string comes back out. Nothing
downstream is ever handed the command, the file path, or the prompt, because
the function does not return them.

`test/privacy.test.js` enforces this end to end: it drives the real hook
binaries through a full turn with secrets planted in the tool input, then
reads back every byte written to disk and fails if any of them survived.

What is stored, per session, is the whole of it:

```json
{"category":"deploy","weight":3,"ts":1787977174940}
```

## Install

```bash
node adapters/claude-code/install.js          # print the config
node adapters/claude-code/install.js --write  # apply it (backs up settings.json)
```

Restart Claude Code afterwards. To switch it off without uninstalling:

```bash
echo '{"earnMode":false}' > ~/.waitads/config.json
```

## Try it without Claude Code

The hooks are plain scripts that read JSON on stdin, so a turn can be driven
by hand:

```bash
export WAITADS_HOME=/tmp/waitads-demo
S='{"session_id":"demo-1"}'

echo "$S" | node adapters/claude-code/bin/on-prompt.js
echo '{"session_id":"demo-1","tool_name":"Bash","tool_input":{"command":"vercel deploy --prod"}}' \
  | node adapters/claude-code/bin/on-tool.js
echo "$S" | node adapters/claude-code/bin/statusline.js
#   ⏳ SPONSORED  Fly.io — Run your app close to your users, in every region.
echo "$S" | node adapters/claude-code/bin/on-stop.js
```

## Tests

```bash
npm run test:adapter
```

## Categories

Six, matching the campaign inventory. Rules live in `src/rules.js`.

| Category        | Example signal                          |
| --------------- | --------------------------------------- |
| `deploy`        | `vercel deploy`, `fly.toml`             |
| `db`            | `prisma migrate`, `schema.prisma`       |
| `auth`          | `npm install next-auth`, `auth.ts`      |
| `observability` | `kubectl logs`, `sentry.client.config.` |
| `testing`       | `npm test`, `*.test.ts`                 |
| `infra`         | `docker build`, `Dockerfile`            |

A signal from a command counts for more than one from a file touch, and
signals decay after 15 minutes — a `docker build` from earlier says nothing
about what is happening now. An unrecognized turn falls back to a labeled
tip rather than an empty slot.

## Impression eligibility

An impression is recorded only when a sponsored placement existed for at
least 3 seconds of an active turn. Ledger entries are append-only in
`~/.waitads/ledger.jsonl` and every one is marked `"demo": true` — the
reward figures are placeholders, not earnings.

## Inventory

`data/creatives.json` is **placeholder inventory**. No advertiser has
approved, reviewed, or paid for any of it; the brand names are stand-ins for
validating the format locally. Replace the file before any real pilot.

## Not done yet

- Fetching creatives from the ad server instead of a local file (F2).
- `agent.turn.failed` is defined in `src/events.js` but not yet emitted —
  Claude Code has no distinct failure hook, so it needs a different signal.
- Codex, which has no configurable status line and needs a different surface.
