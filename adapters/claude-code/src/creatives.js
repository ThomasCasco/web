'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Local creative selection.
 *
 * In F1 the inventory is a JSON file on disk and nothing touches the network.
 * When the ad server lands (F2) only `selectCreative` changes: it will send
 * the category string and receive a creative back. Everything above and below
 * it, including the privacy boundary, stays exactly as it is.
 */

const DEFAULT_INVENTORY_PATH = path.join(__dirname, '..', 'data', 'creatives.json');

/** Placeholder economics. Not a real payout, and labelled as demo everywhere. */
const DEMO_REWARD_USD = 0.0024;
const PLACEMENT_TTL_MS = 5 * 60 * 1000;

let cachedInventory = null;

function loadInventory(inventoryPath = DEFAULT_INVENTORY_PATH) {
  if (cachedInventory) return cachedInventory;
  try {
    cachedInventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
  } catch {
    cachedInventory = { campaigns: {}, fallback: [] };
  }
  return cachedInventory;
}

/**
 * Pick a creative for a category.
 *
 * Returns a sponsor decision in the shape AGENTS.md specifies: campaign id,
 * creative id, category, reward estimate and expiry. When no campaign covers
 * the category, callers get a labelled non-sponsored fallback instead of an
 * empty placement — an unsold slot should still be worth reading.
 *
 * @param {string|null} category
 * @param {{ lastCreativeByCategory?: Record<string,string>, now?: number, inventoryPath?: string }} [options]
 */
function selectCreative(category, options = {}) {
  const inventory = loadInventory(options.inventoryPath);
  const now = options.now ?? Date.now();
  const seen = options.lastCreativeByCategory || {};

  const pool = category ? inventory.campaigns?.[category] : null;

  if (Array.isArray(pool) && pool.length > 0) {
    // Frequency cap: never show the same creative twice in a row for a
    // category while another one is available.
    const lastShown = seen[category];
    const fresh = pool.filter((c) => c.creativeId !== lastShown);
    const candidates = fresh.length > 0 ? fresh : pool;
    const chosen = candidates[Math.floor(now / 1000) % candidates.length];

    return {
      sponsored: true,
      campaignId: chosen.campaignId,
      creativeId: chosen.creativeId,
      category,
      advertiser: chosen.advertiser,
      copy: chosen.copy,
      url: chosen.url,
      estimatedRewardUsdDemo: DEMO_REWARD_USD,
      expiresAt: now + PLACEMENT_TTL_MS,
    };
  }

  const tips = Array.isArray(inventory.fallback) ? inventory.fallback : [];
  if (tips.length === 0) return null;

  const tip = tips[Math.floor(now / 1000) % tips.length];
  return {
    sponsored: false,
    campaignId: null,
    creativeId: tip.creativeId,
    category: category || null,
    advertiser: null,
    copy: tip.copy,
    url: null,
    estimatedRewardUsdDemo: 0,
    expiresAt: now + PLACEMENT_TTL_MS,
  };
}

/** Test seam: drop the module-level inventory cache. */
function resetCache() {
  cachedInventory = null;
}

module.exports = { selectCreative, loadInventory, resetCache, DEMO_REWARD_USD, DEFAULT_INVENTORY_PATH };
