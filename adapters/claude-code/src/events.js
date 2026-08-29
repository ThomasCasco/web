'use strict';

/**
 * Normalized agent lifecycle events.
 *
 * These are the contract described in AGENTS.md. The Claude Code adapter is
 * the first real producer of them; the web prototype's simulated lifecycle
 * emits the same shapes. Anything downstream (eligibility, ledger, and later
 * the ad server) consumes only these, never agent-specific payloads.
 */

const TURN_STARTED = 'agent.turn.started';
const ACTIVITY_UPDATED = 'agent.activity.updated';
const TURN_COMPLETED = 'agent.turn.completed';
const TURN_FAILED = 'agent.turn.failed';

const ADAPTER = 'claude-code';

function baseEvent(type, sessionId, extra) {
  return {
    type,
    adapter: ADAPTER,
    sessionId,
    ts: Date.now(),
    ...extra,
  };
}

/**
 * @param {string} sessionId
 * @param {string} turnId
 */
function turnStarted(sessionId, turnId) {
  return baseEvent(TURN_STARTED, sessionId, { turnId });
}

/**
 * Carries a category only — never the tool input that produced it.
 * @param {string} sessionId
 * @param {string} turnId
 * @param {string} category
 * @param {'command'|'path'} source
 */
function activityUpdated(sessionId, turnId, category, source) {
  return baseEvent(ACTIVITY_UPDATED, sessionId, { turnId, category, source });
}

/**
 * @param {string} sessionId
 * @param {string} turnId
 * @param {number} durationMs
 */
function turnCompleted(sessionId, turnId, durationMs) {
  return baseEvent(TURN_COMPLETED, sessionId, { turnId, durationMs });
}

/**
 * @param {string} sessionId
 * @param {string} turnId
 * @param {string} reason
 */
function turnFailed(sessionId, turnId, reason) {
  return baseEvent(TURN_FAILED, sessionId, { turnId, reason });
}

module.exports = {
  TURN_STARTED,
  ACTIVITY_UPDATED,
  TURN_COMPLETED,
  TURN_FAILED,
  ADAPTER,
  turnStarted,
  activityUpdated,
  turnCompleted,
  turnFailed,
};
