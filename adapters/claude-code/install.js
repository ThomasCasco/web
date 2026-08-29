#!/usr/bin/env node
'use strict';

/**
 * Prints (or writes) the Claude Code settings needed to run the adapter.
 *
 * Default behaviour is to print, because silently rewriting somebody's
 * settings.json is not a thing an ad product should do on install. Pass
 * --write to apply it, which backs up the existing file first.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const BIN = path.join(__dirname, 'bin');
const SETTINGS = path.join(os.homedir(), '.claude', 'settings.json');

const config = {
  statusLine: {
    type: 'command',
    command: `node ${path.join(BIN, 'statusline.js')}`,
    padding: 0,
  },
  hooks: {
    UserPromptSubmit: [
      { hooks: [{ type: 'command', command: `node ${path.join(BIN, 'on-prompt.js')}` }] },
    ],
    PreToolUse: [
      {
        matcher: 'Bash|Edit|Write|MultiEdit|NotebookEdit|Read',
        hooks: [{ type: 'command', command: `node ${path.join(BIN, 'on-tool.js')}` }],
      },
    ],
    Stop: [{ hooks: [{ type: 'command', command: `node ${path.join(BIN, 'on-stop.js')}` }] }],
  },
};

function readSettings() {
  try {
    return JSON.parse(fs.readFileSync(SETTINGS, 'utf8'));
  } catch {
    return {};
  }
}

function write() {
  const existing = readSettings();

  if (fs.existsSync(SETTINGS)) {
    const backup = `${SETTINGS}.waitads-backup-${Date.now()}`;
    fs.copyFileSync(SETTINGS, backup);
    console.log(`Backed up existing settings to ${backup}`);
  }

  if (existing.statusLine) {
    console.log('\nNote: a statusLine was already configured. WaitAds replaced it;');
    console.log('the backup above has your previous one.');
  }

  const merged = {
    ...existing,
    statusLine: config.statusLine,
    hooks: { ...(existing.hooks || {}) },
  };

  // Append to each hook event rather than clobbering hooks already set up.
  for (const [event, entries] of Object.entries(config.hooks)) {
    merged.hooks[event] = [...(existing.hooks?.[event] || []), ...entries];
  }

  fs.mkdirSync(path.dirname(SETTINGS), { recursive: true });
  fs.writeFileSync(SETTINGS, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');
  console.log(`\nWrote ${SETTINGS}`);
  console.log('Restart Claude Code to load the hooks.');
}

if (process.argv.includes('--write')) {
  write();
} else {
  console.log('Add this to ~/.claude/settings.json:\n');
  console.log(JSON.stringify(config, null, 2));
  console.log('\nOr run:  node adapters/claude-code/install.js --write');
  console.log('To turn it off later:  echo \'{"earnMode":false}\' > ~/.waitads/config.json');
}
