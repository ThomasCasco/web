#!/usr/bin/env node
'use strict';

/**
 * Stop hook -> agent.turn.completed
 *
 * Closes the placement and decides whether the turn produced an eligible
 * impression. Eligibility is deliberately strict: a placement that existed
 * for a blink was never really seen, and counting it would be exactly the
 * kind of inflated inventory that makes this category untrustworthy.
 */

const { runHook } = require('../src/io');
const { readState, writeState, appendLedger } = require('../src/state');
const { turnCompleted } = require('../src/events');

/** A placement must survive this long to count as seen. */
const MIN_VIEWABLE_MS = 3000;

runHook((payload) => {
  const sessionId = payload?.session_id || 'unknown';
  const state = readState(sessionId);

  if (!state.turn?.active) return;

  const startedAt = state.turn.startedAt || Date.now();
  const durationMs = Date.now() - startedAt;
  const event = turnCompleted(sessionId, state.turn.id, durationMs);

  const placement = state.currentPlacement;
  const eligible =
    Boolean(placement) &&
    placement.sponsored === true &&
    durationMs >= MIN_VIEWABLE_MS;

  if (eligible) {
    state.impressions += 1;
    appendLedger({
      type: 'impression.verified',
      demo: true,
      sessionId: state.sessionId,
      turnId: state.turn.id,
      campaignId: placement.campaignId,
      creativeId: placement.creativeId,
      category: placement.category,
      durationMs,
      estimatedRewardUsdDemo: placement.estimatedRewardUsdDemo,
      ts: event.ts,
    });
  }

  state.turn = { active: false, startedAt: null, id: null };
  state.currentPlacement = null;

  writeState(sessionId, state);
});
