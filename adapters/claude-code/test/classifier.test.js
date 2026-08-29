'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { classifyToolCall, resolveCategory } = require('../src/classifier');

const bash = (command) => ({ tool_name: 'Bash', tool_input: { command } });
const edit = (file_path) => ({ tool_name: 'Edit', tool_input: { file_path } });

test('classifies deploy commands', () => {
  assert.equal(classifyToolCall(bash('vercel deploy --prod')).category, 'deploy');
  assert.equal(classifyToolCall(bash('fly deploy')).category, 'deploy');
  assert.equal(classifyToolCall(bash('git push origin main')).category, 'deploy');
});

test('classifies database work', () => {
  assert.equal(classifyToolCall(bash('npx prisma migrate dev')).category, 'db');
  assert.equal(classifyToolCall(bash('psql -h localhost')).category, 'db');
  assert.equal(classifyToolCall(edit('prisma/schema.prisma')).category, 'db');
  assert.equal(classifyToolCall(edit('db/migrations/001_init.sql')).category, 'db');
});

test('classifies testing, infra and observability', () => {
  assert.equal(classifyToolCall(bash('npm test')).category, 'testing');
  assert.equal(classifyToolCall(edit('src/auth.test.ts')).category, 'testing');
  assert.equal(classifyToolCall(bash('docker build -t app .')).category, 'infra');
  assert.equal(classifyToolCall(edit('Dockerfile')).category, 'infra');
  assert.equal(classifyToolCall(bash('kubectl logs pod-1')).category, 'observability');
});

test('classifies auth work', () => {
  assert.equal(classifyToolCall(bash('npm install next-auth')).category, 'auth');
  assert.equal(classifyToolCall(edit('src/middleware/auth.ts')).category, 'auth');
});

test('a command signal outweighs a file signal', () => {
  assert.ok(classifyToolCall(bash('npm test')).weight > classifyToolCall(edit('Dockerfile')).weight);
});

test('unrecognized input yields no signal', () => {
  assert.equal(classifyToolCall(bash('ls -la')), null);
  assert.equal(classifyToolCall(edit('README.md')), null);
  assert.equal(classifyToolCall({ tool_name: 'WebFetch', tool_input: { url: 'x' } }), null);
  assert.equal(classifyToolCall(null), null);
  assert.equal(classifyToolCall({ tool_name: 'Bash', tool_input: {} }), null);
});

test('docker logs reads as observability, not infra', () => {
  assert.equal(classifyToolCall(bash('docker logs api')).category, 'observability');
  assert.equal(classifyToolCall(bash('docker build .')).category, 'infra');
});

test('resolveCategory picks the highest accumulated score', () => {
  const now = Date.now();
  const signals = [
    { category: 'infra', weight: 1, ts: now - 1000 },
    { category: 'deploy', weight: 3, ts: now - 500 },
  ];
  assert.equal(resolveCategory(signals, { now }).category, 'deploy');
});

test('resolveCategory drops signals outside the window', () => {
  const now = Date.now();
  const signals = [
    { category: 'infra', weight: 3, ts: now - 60 * 60 * 1000 },
    { category: 'testing', weight: 1, ts: now - 1000 },
  ];
  assert.equal(resolveCategory(signals, { now }).category, 'testing');
});

test('resolveCategory breaks ties toward the more recent signal', () => {
  const now = Date.now();
  const signals = [
    { category: 'db', weight: 3, ts: now - 5000 },
    { category: 'deploy', weight: 3, ts: now - 100 },
  ];
  assert.equal(resolveCategory(signals, { now }).category, 'deploy');
});

test('resolveCategory returns null without usable signals', () => {
  assert.equal(resolveCategory([]), null);
  assert.equal(resolveCategory(null), null);
  assert.equal(resolveCategory([{ category: 'db', weight: 3, ts: 0 }], { now: Date.now() }), null);
});
