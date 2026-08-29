'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const BIN = path.join(__dirname, '..', 'bin');

function run(script, payload, home) {
  return execFileSync(process.execPath, [path.join(BIN, script)], {
    input: JSON.stringify(payload),
    env: { ...process.env, WAITADS_HOME: home, NO_COLOR: '1' },
    encoding: 'utf8',
  });
}

function freshHome(label) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `waitads-${label}-`));
}

function statePath(home, sessionId) {
  return path.join(home, 'sessions', `${sessionId}.json`);
}

function readLedger(home) {
  const file = path.join(home, 'ledger.jsonl');
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

test('no placement is rendered outside an active turn', () => {
  const home = freshHome('idle');
  const out = run('statusline.js', { session_id: 'idle-session' }, home);
  assert.equal(out.trim(), '');
});

test('an active turn with a deploy signal renders a sponsored line', () => {
  const home = freshHome('active');
  const sessionId = 'active-session';

  run('on-prompt.js', { session_id: sessionId }, home);
  run(
    'on-tool.js',
    { session_id: sessionId, tool_name: 'Bash', tool_input: { command: 'vercel deploy' } },
    home,
  );

  const out = run('statusline.js', { session_id: sessionId }, home);
  assert.match(out, /SPONSORED/);
  assert.match(out, /Railway|Fly\.io/);
});

test('an active turn with no recognizable signal falls back to a labelled tip', () => {
  const home = freshHome('fallback');
  const sessionId = 'fallback-session';

  run('on-prompt.js', { session_id: sessionId }, home);
  run('on-tool.js', { session_id: sessionId, tool_name: 'Bash', tool_input: { command: 'ls -la' } }, home);

  const out = run('statusline.js', { session_id: sessionId }, home);
  assert.match(out, /WAITADS/);
  assert.doesNotMatch(out, /SPONSORED/);
});

test('the placement is stable across status refreshes within one turn', () => {
  const home = freshHome('stable');
  const sessionId = 'stable-session';

  run('on-prompt.js', { session_id: sessionId }, home);
  run(
    'on-tool.js',
    { session_id: sessionId, tool_name: 'Bash', tool_input: { command: 'npm test' } },
    home,
  );

  const first = run('statusline.js', { session_id: sessionId }, home);
  const second = run('statusline.js', { session_id: sessionId }, home);
  assert.equal(first, second);
});

test('a turn too short to be seen produces no impression', () => {
  const home = freshHome('tooshort');
  const sessionId = 'tooshort-session';

  run('on-prompt.js', { session_id: sessionId }, home);
  run(
    'on-tool.js',
    { session_id: sessionId, tool_name: 'Bash', tool_input: { command: 'vercel deploy' } },
    home,
  );
  run('statusline.js', { session_id: sessionId }, home);
  run('on-stop.js', { session_id: sessionId }, home);

  assert.equal(readLedger(home).length, 0);
});

test('a turn long enough to be seen records one verified impression', () => {
  const home = freshHome('eligible');
  const sessionId = 'eligible-session';

  run('on-prompt.js', { session_id: sessionId }, home);
  run(
    'on-tool.js',
    { session_id: sessionId, tool_name: 'Bash', tool_input: { command: 'vercel deploy' } },
    home,
  );
  run('statusline.js', { session_id: sessionId }, home);

  // Backdate the turn instead of sleeping through the viewability threshold.
  const state = JSON.parse(fs.readFileSync(statePath(home, sessionId), 'utf8'));
  state.turn.startedAt -= 10_000;
  fs.writeFileSync(statePath(home, sessionId), JSON.stringify(state));

  run('on-stop.js', { session_id: sessionId }, home);

  const ledger = readLedger(home);
  assert.equal(ledger.length, 1);
  assert.equal(ledger[0].type, 'impression.verified');
  assert.equal(ledger[0].category, 'deploy');
  assert.equal(ledger[0].demo, true);
});

test('the turn closes and the placement is cleared on stop', () => {
  const home = freshHome('closes');
  const sessionId = 'closes-session';

  run('on-prompt.js', { session_id: sessionId }, home);
  run('statusline.js', { session_id: sessionId }, home);
  run('on-stop.js', { session_id: sessionId }, home);

  const state = JSON.parse(fs.readFileSync(statePath(home, sessionId), 'utf8'));
  assert.equal(state.turn.active, false);
  assert.equal(state.currentPlacement, null);
  assert.equal(run('statusline.js', { session_id: sessionId }, home).trim(), '');
});

test('hooks survive malformed input without failing the session', () => {
  const home = freshHome('robust');
  for (const script of ['on-prompt.js', 'on-tool.js', 'on-stop.js', 'statusline.js']) {
    assert.doesNotThrow(() => {
      execFileSync(process.execPath, [path.join(BIN, script)], {
        input: 'not json at all',
        env: { ...process.env, WAITADS_HOME: home },
        encoding: 'utf8',
      });
    }, `${script} should not fail on malformed input`);
  }
});
