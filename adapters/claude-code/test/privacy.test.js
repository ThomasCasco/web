'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

/**
 * End-to-end guard for the product's central claim.
 *
 * This drives the real hook binaries through a full turn using tool input
 * stuffed with distinctive secrets, then reads back every byte WaitAds wrote
 * to disk and asserts none of those secrets survived. If someone later widens
 * what the hooks persist, this fails.
 */

const BIN = path.join(__dirname, '..', 'bin');
const SECRETS = [
  'SUPERSECRET_TOKEN_9F3A',
  'acme-internal-billing',
  'refactor the payment flow',
];

function runHook(script, payload, home) {
  execFileSync(process.execPath, [path.join(BIN, script)], {
    input: JSON.stringify(payload),
    env: { ...process.env, WAITADS_HOME: home, NO_COLOR: '1' },
    encoding: 'utf8',
  });
}

function readAllWrittenBytes(dir) {
  const out = [];
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else out.push(fs.readFileSync(full, 'utf8'));
    }
  };
  if (fs.existsSync(dir)) walk(dir);
  return out.join('\n');
}

test('no raw command, path or prompt text is ever persisted', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'waitads-privacy-'));
  const sessionId = 'privacy-test-session';

  runHook('on-prompt.js', { session_id: sessionId, prompt: SECRETS[2] }, home);

  runHook(
    'on-tool.js',
    {
      session_id: sessionId,
      tool_name: 'Bash',
      tool_input: { command: `vercel deploy --token=${SECRETS[0]}` },
    },
    home,
  );

  runHook(
    'on-tool.js',
    {
      session_id: sessionId,
      tool_name: 'Edit',
      tool_input: { file_path: `/home/dev/${SECRETS[1]}/prisma/schema.prisma` },
    },
    home,
  );

  runHook('on-stop.js', { session_id: sessionId }, home);

  const written = readAllWrittenBytes(home);
  assert.ok(written.length > 0, 'expected the hooks to have written state');

  for (const secret of SECRETS) {
    assert.ok(
      !written.includes(secret),
      `secret "${secret}" leaked into WaitAds state on disk`,
    );
  }
});

test('the signal survives even though its raw input does not', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'waitads-signal-'));
  const sessionId = 'signal-test-session';

  runHook('on-prompt.js', { session_id: sessionId }, home);
  runHook(
    'on-tool.js',
    {
      session_id: sessionId,
      tool_name: 'Bash',
      tool_input: { command: 'vercel deploy --token=SUPERSECRET_TOKEN_9F3A' },
    },
    home,
  );

  const state = JSON.parse(
    fs.readFileSync(path.join(home, 'sessions', `${sessionId}.json`), 'utf8'),
  );

  assert.equal(state.signals.length, 1);
  assert.equal(state.signals[0].category, 'deploy');
  assert.deepEqual(Object.keys(state.signals[0]).sort(), ['category', 'ts', 'weight']);
});
