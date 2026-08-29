#!/usr/bin/env node
'use strict';

/**
 * Status line renderer.
 *
 * Prints one line while a turn is active, and nothing at all when it is not.
 * The placement is chosen once per turn and then reused: re-rolling on every
 * status refresh would flicker, and would also let a single wait masquerade
 * as many impressions.
 */

const fs = require('fs');
const path = require('path');

const { readStdinJson } = require('../src/io');
const { readState, writeState, sessionsDir, homeDir } = require('../src/state');
const { resolveCategory } = require('../src/classifier');
const { selectCreative } = require('../src/creatives');

const RESET = '\x1b[0m';
const DIM = '\x1b[2m';
const AMBER = '\x1b[33m';

function colorsEnabled() {
  return !process.env.NO_COLOR;
}

function paint(code, text) {
  return colorsEnabled() ? `${code}${text}${RESET}` : text;
}

/** Installation is the opt-in; this is the kill switch. */
function earnModeEnabled() {
  if (process.env.WAITADS_EARN === '0') return false;
  try {
    const config = JSON.parse(fs.readFileSync(path.join(homeDir(), 'config.json'), 'utf8'));
    return config.earnMode !== false;
  } catch {
    return true;
  }
}

/** Fallback when the status line is invoked without a session id on stdin. */
function mostRecentSessionId() {
  try {
    const files = fs
      .readdirSync(sessionsDir())
      .filter((f) => f.endsWith('.json'))
      .map((f) => ({ f, mtime: fs.statSync(path.join(sessionsDir(), f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime);
    return files.length > 0 ? files[0].f.replace(/\.json$/, '') : null;
  } catch {
    return null;
  }
}

function truncate(text, max) {
  if (max <= 1 || text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

async function main() {
  if (!earnModeEnabled()) return;

  const payload = await readStdinJson(300);
  const sessionId = payload?.session_id || mostRecentSessionId();
  if (!sessionId) return;

  const state = readState(sessionId);

  // No turn in flight means no eligible placement. Print nothing rather than
  // occupying the developer's status line with inventory.
  if (!state.turn?.active) return;

  const now = Date.now();
  const resolved = resolveCategory(state.signals, { now });
  const category = resolved?.category ?? null;

  let placement = state.currentPlacement;
  const stale =
    !placement || placement.expiresAt <= now || (category && placement.category !== category);

  if (stale) {
    placement = selectCreative(category, {
      lastCreativeByCategory: state.lastCreativeByCategory,
      now,
    });
    if (!placement) return;

    state.currentPlacement = placement;
    if (placement.sponsored && placement.category) {
      state.lastCreativeByCategory[placement.category] = placement.creativeId;
    }
    writeState(sessionId, state);
  }

  // Fit to the terminal by trimming the copy while it is still plain text —
  // measuring after painting would count the ANSI escapes as visible width.
  const label = placement.sponsored ? 'SPONSORED' : 'WAITADS';
  const prefix = placement.sponsored ? `${placement.advertiser} — ` : '';
  const width = Number(process.stdout.columns) || 120;
  const budget = width - (`⏳ ${label}  ${prefix}`.length + 1);
  const copy = truncate(placement.copy, Math.max(budget, 12));

  const body = placement.sponsored
    ? `${paint(AMBER, placement.advertiser)} ${paint(DIM, '—')} ${copy}`
    : paint(DIM, copy);

  process.stdout.write(`${paint(DIM, '⏳')} ${paint(DIM, label)}  ${body}\n`);
}

main().catch(() => {
  // A broken status line must never interrupt a coding session.
  process.exit(0);
});
