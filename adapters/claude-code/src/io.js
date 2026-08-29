'use strict';

/**
 * Hook I/O helpers.
 *
 * Every entry point in `bin/` is spawned by Claude Code in the developer's
 * hot path. Two rules follow from that, and they are enforced here rather
 * than repeated in each script:
 *
 *   1. Never hang. Reading stdin is bounded by a timeout.
 *   2. Never fail loudly. A crash in WaitAds must not surface as an error in
 *      somebody's coding session, so entry points always exit 0.
 */

/**
 * Read and parse JSON from stdin, giving up after `timeoutMs`.
 * @param {number} timeoutMs
 * @returns {Promise<object|null>}
 */
function readStdinJson(timeoutMs = 1000) {
  return new Promise((resolve) => {
    let raw = '';
    let settled = false;

    const finish = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };

    const timer = setTimeout(() => finish(null), timeoutMs);
    timer.unref?.();

    if (process.stdin.isTTY) return finish(null);

    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      raw += chunk;
    });
    process.stdin.on('end', () => {
      try {
        finish(raw.trim() ? JSON.parse(raw) : null);
      } catch {
        finish(null);
      }
    });
    process.stdin.on('error', () => finish(null));
  });
}

/**
 * Run a hook body, swallowing any failure.
 * @param {(payload: object|null) => void|Promise<void>} handler
 */
async function runHook(handler) {
  try {
    const payload = await readStdinJson();
    await handler(payload);
  } catch (error) {
    if (process.env.WAITADS_DEBUG) {
      process.stderr.write(`waitads: ${error && error.stack ? error.stack : error}\n`);
    }
  } finally {
    process.exit(0);
  }
}

module.exports = { readStdinJson, runHook };
