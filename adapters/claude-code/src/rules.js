'use strict';

/**
 * Contextual category rules.
 *
 * These rules are the whole targeting system. They run on the developer's
 * machine and are intentionally boring: literal command and path patterns,
 * no model inference. That keeps them fast, cheap, and — most importantly —
 * auditable by anyone who wants to know what this thing infers about them.
 */

const CATEGORIES = ['deploy', 'db', 'auth', 'observability', 'testing', 'infra'];

/** A command match is far stronger evidence of intent than a file touch. */
const WEIGHT_COMMAND = 3;
const WEIGHT_PATH = 1;

const RULES = [
  {
    category: 'deploy',
    commands: [
      /\b(vercel|netlify|fly|railway|wrangler|render|surge)\s+(deploy|publish|up|launch)\b/,
      /\bnpx\s+(vercel|netlify-cli|wrangler)\b/,
      /\bgit\s+push\b[^|;&]*\b(main|master|production|prod)\b/,
      /\bgh\s+workflow\s+run\b/,
      /\beb\s+deploy\b/,
    ],
    paths: [
      /(^|\/)vercel\.json$/,
      /(^|\/)netlify\.toml$/,
      /(^|\/)fly\.toml$/,
      /(^|\/)railway\.(json|toml)$/,
      /(^|\/)render\.yaml$/,
      /(^|\/)Procfile$/,
      /(^|\/)\.github\/workflows\/[^/]*\.ya?ml$/,
    ],
  },
  {
    category: 'db',
    commands: [
      /\bprisma\s+(migrate|db|generate|studio)\b/,
      /\bdrizzle-kit\b/,
      /\bknex\s+migrate\b/,
      /\bsequelize\b[^|;&]*\bmigrat/,
      /\balembic\s+(upgrade|revision)\b/,
      /\b(psql|mongosh|mysql|sqlite3|redis-cli)\b/,
      /\bsupabase\s+(db|migration)\b/,
    ],
    paths: [
      /\.sql$/,
      /(^|\/)schema\.prisma$/,
      /(^|\/)migrations?\//,
      /(^|\/)drizzle\.config\./,
      /(^|\/)knexfile\./,
    ],
  },
  {
    category: 'auth',
    commands: [
      /\b(npm|pnpm|yarn|bun)\s+(i|add|install)\b[^|;&]*(next-auth|@clerk\/|@auth0\/|passport|jsonwebtoken|bcryptjs?|lucia|@supabase\/auth|better-auth)/,
    ],
    paths: [
      /(^|\/)auth[^/]*\.[jt]sx?$/,
      /(^|\/)[^/]*auth\.[jt]sx?$/,
      /(^|\/)middlewares?\/auth/,
      /(^|\/)(login|signup|register|session)\.[jt]sx?$/,
      /(^|\/)[^/]*jwt[^/]*\.[jt]sx?$/,
    ],
  },
  {
    category: 'observability',
    commands: [
      /\b(docker|kubectl)\s+logs\b/,
      /\bjournalctl\b/,
      /\btail\s+(-[a-zA-Z]+\s+)*[^|;&]*\.log\b/,
      /\bsentry-cli\b/,
      /\bpm2\s+logs\b/,
    ],
    paths: [
      /(^|\/)sentry\.(client|server|edge)\.config\./,
      /(^|\/)instrumentation\.[jt]s$/,
      /\.log$/,
    ],
  },
  {
    category: 'testing',
    commands: [
      /\b(npm|pnpm|yarn|bun)\s+(run\s+)?test\b/,
      /\b(jest|vitest|mocha|playwright|cypress|ava)\b/,
      /\bnode\s+--test\b/,
      /\bpytest\b/,
      /\bgo\s+test\b/,
      /\bcargo\s+test\b/,
    ],
    paths: [
      /\.(test|spec)\.[jt]sx?$/,
      /(^|\/)(playwright|vitest|jest|cypress)\.config\./,
      /(^|\/)(tests?|__tests__|e2e)\//,
    ],
  },
  {
    category: 'infra',
    commands: [
      /\bdocker\s+(build|compose|run|push)\b/,
      /\bdocker-compose\b/,
      /\bterraform\s+(plan|apply|init|destroy)\b/,
      /\bkubectl\s+(apply|get|describe|rollout)\b/,
      /\b(helm|pulumi|ansible-playbook)\b/,
    ],
    paths: [
      /(^|\/)Dockerfile[^/]*$/,
      /(^|\/)docker-compose[^/]*\.ya?ml$/,
      /\.tf$/,
      /(^|\/)(k8s|kubernetes|charts)\//,
    ],
  },
];

module.exports = { CATEGORIES, RULES, WEIGHT_COMMAND, WEIGHT_PATH };
