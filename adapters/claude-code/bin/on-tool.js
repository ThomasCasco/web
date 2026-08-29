#!/usr/bin/env node
'use strict';

/**
 * PreToolUse hook -> agent.activity.updated
 *
 * This is the only place raw tool input is ever seen. It goes into the
 * classifier and what comes back is a category; the raw command or path is
 * not stored, logged, or forwarded anywhere.
 */

const { runHook } = require('../src/io');
const { classifyToolCall } = require('../src/classifier');
const { readState, writeState } = require('../src/state');

runHook((payload) => {
  if (!payload) return;

  const signal = classifyToolCall(payload);
  if (!signal) return;

  const sessionId = payload.session_id || 'unknown';
  const state = readState(sessionId);

  state.signals.push({
    category: signal.category,
    weight: signal.weight,
    ts: Date.now(),
  });

  writeState(sessionId, state);
});
