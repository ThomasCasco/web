# WaitAds

Monetize AI agent waiting time with opt-in, privacy-first sponsored experiences.

## MVP

This repository is the cloud-first prototype for WaitAds.

### Core flow

1. User starts an AI coding task.
2. WaitAds receives a `turn.started` event.
3. A relevant sponsor card is shown while the agent is working.
4. WaitAds receives `turn.completed`.
5. The impression is verified and a simulated reward is credited.

### MVP scope

- Next.js + TypeScript web dashboard.
- Simulated Codex task lifecycle.
- Sponsor selection mock.
- Earnings ledger mock.
- Privacy-first architecture: do not transmit source code or raw prompts to advertisers.
- `AGENTS.md` contains the implementation brief for Codex.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Next milestones

- Replace simulated task lifecycle with real Codex event ingestion.
- Add authentication and persistent sessions.
- Add advertiser campaigns and frequency caps.
- Add fraud-resistant impression verification.
- Add payout ledger.
- Add adapters for Claude Code and Gemini CLI.
