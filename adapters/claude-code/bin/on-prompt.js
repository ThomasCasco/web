#!/usr/bin/env node
'use strict';

/**
 * UserPromptSubmit hook -> agent.turn.started
 *
 * The turn is the eligibility window. A placement may exist only between this
 * event and agent.turn.completed, which is what keeps the promise that an ad
 * never outlives the work it was shown during.
 */

const { runHook } = require('../src/io');
const { readState, writeState } = require('../src/state');

runHook((payload) => {
  const sessionId = payload?.session_id || 'unknown';
  const state = readState(sessionId);

  state.turn = {
    active: true,
    startedAt: Date.now(),
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
  };
  // A new turn has no placement yet; the statusline creates one once the
  // classifier has something to go on.
  state.currentPlacement = null;

  writeState(sessionId, state);
});
