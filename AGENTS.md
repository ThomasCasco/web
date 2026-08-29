# WaitAds — Codex project brief

## Product
WaitAds is an opt-in monetization layer for AI coding-agent wait time. While an agent turn is actively running, WaitAds may show a relevant developer sponsor. When the turn ends, the sponsor disappears and an eligible impression can be credited to the user's wallet.

## Product principles
- Never obstruct the agent result.
- Never require ad clicks to continue.
- Ads are opt-in (`Earn mode`).
- Do not send source code or raw prompts to advertisers.
- Prefer local/on-device classification for contextual categories when possible.
- Clearly label all sponsor content.
- Track verified impressions, not fake engagement.
- Design the core as agent-agnostic; Codex is the first adapter.

## MVP architecture
- `app/`: Next.js web dashboard and prototype UI.
- `adapters/claude-code/`: first real agent adapter. Claude Code hooks emit the
  normalized events below, intent is classified on-device, and the placement is
  rendered in the status line only while a turn is active.
- The browser lifecycle in `app/` is still simulated; the adapter is not.
- Next step is a server-side event ingestion boundary with normalized events:
  - `agent.turn.started`
  - `agent.activity.updated`
  - `agent.turn.completed`
  - `agent.turn.failed`
- Sponsor decision output should contain campaign id, creative id, category, reward estimate, and expiry.
- Ledger entries must be append-only in the real backend.

## Immediate engineering tasks
1. Extract the simulated agent state into a typed adapter interface.
2. Add a mock adapter implementation used by the existing demo.
3. Define normalized agent event types. *(Done for the adapter in
   `adapters/claude-code/src/events.js`; the web app still needs to consume
   the same shapes.)*
4. Add API routes for starting/completing a demo session.
5. Define sponsor campaign and impression types. *(Sponsor decision shape is
   implemented in `adapters/claude-code/src/creatives.js`.)*
6. Add a simple in-memory eligibility/frequency-cap service for the prototype.
   *(Per-category frequency cap and a 3s viewability threshold now exist in
   the adapter; not yet shared with the web app.)*
7. Keep the UI functional throughout each change.
8. Point `app/` at the adapter's real ledger instead of simulated counters.

## Real Codex integration research target
Build a Codex adapter around supported programmatic Codex execution/event APIs. Do not scrape or inject into the official Codex UI. The adapter should translate Codex lifecycle events into the normalized WaitAds event model.

## Definition of done for v0.1
A developer can open the deployed web app, simulate an agent run, see a clearly labeled sponsor only while the task is active, complete the task, and see a verified mock reward added to the session balance.
