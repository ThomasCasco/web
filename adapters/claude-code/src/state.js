'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

/**
 * Per-session state, stored locally.
 *
 * What is persisted here is deliberately minimal: turn status, category
 * signals, and impression bookkeeping. Raw commands, file paths, prompts and
 * terminal output never reach this layer — the classifier drops them before
 * anything is written. `test/privacy.test.js` enforces that.
 */

const STATE_VERSION = 1;
const MAX_SIGNALS = 100;

function homeDir() {
  return process.env.WAITADS_HOME || path.join(os.homedir(), '.waitads');
}

function sessionsDir() {
  return path.join(homeDir(), 'sessions');
}

/**
 * Session ids come from an external process, so they are never trusted as a
 * path segment.
 * @param {string} sessionId
 */
function safeSessionId(sessionId) {
  const cleaned = String(sessionId || 'unknown').replace(/[^A-Za-z0-9_-]/g, '');
  return cleaned.slice(0, 128) || 'unknown';
}

function sessionPath(sessionId) {
  return path.join(sessionsDir(), `${safeSessionId(sessionId)}.json`);
}

function emptyState(sessionId) {
  return {
    version: STATE_VERSION,
    sessionId: safeSessionId(sessionId),
    turn: { active: false, startedAt: null, id: null },
    signals: [],
    impressions: 0,
    lastCreativeByCategory: {},
    currentPlacement: null,
  };
}

/**
 * Read session state, falling back to a fresh one on any error. A corrupt or
 * unreadable state file must never break the developer's agent.
 * @param {string} sessionId
 */
function readState(sessionId) {
  try {
    const raw = fs.readFileSync(sessionPath(sessionId), 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== STATE_VERSION) return emptyState(sessionId);
    return { ...emptyState(sessionId), ...parsed };
  } catch {
    return emptyState(sessionId);
  }
}

/**
 * Persist session state. Writes atomically so a statusline read never sees a
 * half-written file.
 * @param {string} sessionId
 * @param {object} state
 */
function writeState(sessionId, state) {
  try {
    fs.mkdirSync(sessionsDir(), { recursive: true });
    const target = sessionPath(sessionId);
    const tmp = `${target}.${process.pid}.tmp`;
    const toWrite = { ...state, signals: (state.signals || []).slice(-MAX_SIGNALS) };
    fs.writeFileSync(tmp, JSON.stringify(toWrite), 'utf8');
    fs.renameSync(tmp, target);
    return true;
  } catch {
    return false;
  }
}

/**
 * Append an entry to the local append-only ledger.
 * @param {object} entry
 */
function appendLedger(entry) {
  try {
    fs.mkdirSync(homeDir(), { recursive: true });
    fs.appendFileSync(path.join(homeDir(), 'ledger.jsonl'), `${JSON.stringify(entry)}\n`, 'utf8');
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  STATE_VERSION,
  MAX_SIGNALS,
  homeDir,
  sessionsDir,
  sessionPath,
  safeSessionId,
  emptyState,
  readState,
  writeState,
  appendLedger,
};
