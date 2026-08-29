'use strict';

const { RULES, WEIGHT_COMMAND, WEIGHT_PATH } = require('./rules');

/**
 * Local contextual classifier.
 *
 * Turns a raw agent tool call into at most one coarse category label.
 *
 * The privacy boundary of the whole product lives in this file: raw commands
 * and file paths enter, and only a category string leaves. Nothing downstream
 * (state, ledger, statusline, and later the ad server) is ever given the raw
 * text, because this function never returns it.
 */

/** Tool names whose input can carry an intent signal. */
const BASH_TOOLS = new Set(['Bash', 'BashOutput']);
const FILE_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit', 'Read']);

/**
 * A test file is testing intent regardless of what it happens to exercise:
 * `auth.test.ts` is somebody writing tests, not somebody shopping for an auth
 * provider. Without this, precedence would fall out of the order of the rules
 * array, which is not a reason.
 */
const TEST_FILE = /\.(test|spec)\.[jt]sx?$/;

/**
 * Normalize a path for matching: forward slashes, no leading "./".
 * @param {string} p
 */
function normalizePath(p) {
  return String(p).replace(/\\/g, '/').replace(/^\.\//, '');
}

/**
 * Classify a single tool call.
 *
 * @param {{ tool_name?: string, tool_input?: Record<string, unknown> }} toolCall
 * @returns {{ category: string, weight: number, source: 'command'|'path' } | null}
 */
function classifyToolCall(toolCall) {
  if (!toolCall || typeof toolCall !== 'object') return null;

  const tool = toolCall.tool_name;
  const input = toolCall.tool_input || {};

  if (BASH_TOOLS.has(tool)) {
    const command = typeof input.command === 'string' ? input.command : '';
    if (!command) return null;
    for (const rule of RULES) {
      for (const pattern of rule.commands) {
        if (pattern.test(command)) {
          return { category: rule.category, weight: WEIGHT_COMMAND, source: 'command' };
        }
      }
    }
    return null;
  }

  if (FILE_TOOLS.has(tool)) {
    const raw = input.file_path || input.notebook_path || input.path;
    if (typeof raw !== 'string' || !raw) return null;
    const filePath = normalizePath(raw);
    if (TEST_FILE.test(filePath)) {
      return { category: 'testing', weight: WEIGHT_PATH, source: 'path' };
    }
    for (const rule of RULES) {
      for (const pattern of rule.paths) {
        if (pattern.test(filePath)) {
          return { category: rule.category, weight: WEIGHT_PATH, source: 'path' };
        }
      }
    }
    return null;
  }

  return null;
}

/**
 * Reduce accumulated signals to the single category to target right now.
 *
 * Signals decay: a `docker build` from twenty minutes ago says nothing about
 * what the developer is doing during this turn. Ties go to the most recent
 * signal, because intent moves forward.
 *
 * @param {Array<{category: string, weight: number, ts: number}>} signals
 * @param {{ now?: number, windowMs?: number }} [options]
 * @returns {{ category: string, score: number } | null}
 */
function resolveCategory(signals, options = {}) {
  const now = options.now ?? Date.now();
  const windowMs = options.windowMs ?? 15 * 60 * 1000;

  if (!Array.isArray(signals) || signals.length === 0) return null;

  /** @type {Map<string, {score: number, lastTs: number}>} */
  const scores = new Map();

  for (const signal of signals) {
    if (!signal || typeof signal.category !== 'string') continue;
    if (typeof signal.ts !== 'number' || now - signal.ts > windowMs) continue;

    const entry = scores.get(signal.category) || { score: 0, lastTs: 0 };
    entry.score += Number(signal.weight) || 0;
    entry.lastTs = Math.max(entry.lastTs, signal.ts);
    scores.set(signal.category, entry);
  }

  let winner = null;
  for (const [category, entry] of scores) {
    if (
      winner === null ||
      entry.score > winner.score ||
      (entry.score === winner.score && entry.lastTs > winner.lastTs)
    ) {
      winner = { category, score: entry.score, lastTs: entry.lastTs };
    }
  }

  return winner ? { category: winner.category, score: winner.score } : null;
}

module.exports = { classifyToolCall, resolveCategory, normalizePath };
