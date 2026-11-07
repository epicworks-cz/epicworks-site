/**
 * Cloudflare Pages Function: POST /api/early-access
 *
 * Fields: name, email, platform (github|gitlab|both), consent=yes, website (honeypot),
 * cf-turnstile-response (Turnstile token).
 *
 * Environment (Pages project settings; values live in Vaultwarden and Doppler, never in Git):
 *   TURNSTILE_SECRET_KEY   required in production
 *   MAILGUN_API_KEY        required to deliver requests
 *   MAILGUN_DOMAIN         required to deliver requests
 *   MAILGUN_API_BASE       optional, default https://api.mailgun.net (EU accounts: https://api.eu.mailgun.net)
 *   EARLY_ACCESS_TO        optional, default scan@epicworks.cz
 *   RATE_LIMIT             optional KV namespace binding for per-IP limits
 *   ALLOW_DEV_NO_CAPTCHA   "1" only for local wrangler dev; never set in production
 *
 * Unlike the old /api/contact, this never reports success when delivery failed.
 */

const PLATFORMS = new Set(['github', 'gitlab', 'both']);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RATE_WINDOW_SECONDS = 600;
const RATE_MAX = 5;
const MAX_BODY_BYTES = 16 * 1024; // the form is a few hundred bytes plus a ~2 KB Turnstile token

// Strip control characters (incl. CR/LF) so values cannot break the email subject or body layout.
function clean(value, max) {
  return String(value || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

function wantsJson(request) {
  return (request.headers.get('accept') || '').includes('application/json');
}

function reply(request, status, body) {
  if (!wantsJson(request)) {
    // Plain HTML form post (no JavaScript): send the visitor somewhere readable.
    const target = status === 200 ? '/early-access?sent=1' : `/early-access?error=${status}`;
    return Response.redirect(new URL(target, request.url).toString(), 303);
  }
  // _headers rules do not apply to Function responses, so set these here.
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'X-Robots-Tag': 'noindex',
    },
  });
}

function sameOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin) return true; // some browsers omit Origin on same-origin form posts
  return origin === new URL(request.url).origin;
}

async function verifyTurnstile(env, token, ip) {
  if (!env.TURNSTILE_SECRET_KEY) return env.ALLOW_DEV_NO_CAPTCHA === '1';
  if (!token) return false;
  const form = new FormData();
  form.append('secret', env.TURNSTILE_SECRET_KEY);
  form.append('response', token);
  if (ip) form.append('remoteip', ip);
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
  if (!res.ok) return false;
  const data = await res.json().catch(() => ({}));
  return data.success === true;
}

async function rateLimited(env, ip) {
  if (!env.RATE_LIMIT || !ip) return false;
  const key = `ea:${ip}`;
  const current = parseInt((await env.RATE_LIMIT.get(key)) || '0', 10);
  if (current >= RATE_MAX) return true;
  await env.RATE_LIMIT.put(key, String(current + 1), { expirationTtl: RATE_WINDOW_SECONDS });
  return false;
}

async function deliver(env, entry) {
  if (!env.MAILGUN_API_KEY || !env.MAILGUN_DOMAIN) return false;
  const body = new URLSearchParams();
  body.append('from', `EpicScan website <noreply@${env.MAILGUN_DOMAIN}>`);
  body.append('to', env.EARLY_ACCESS_TO || 'scan@epicworks.cz');
  body.append('h:Reply-To', entry.email);
  body.append('subject', `EpicScan early access: ${entry.name} (${entry.platform})`);
  body.append(
    'text',
    `Name: ${entry.name}\nEmail: ${entry.email}\nPlatform: ${entry.platform}\nConsent: yes\nReceived: ${entry.at}\n`
  );
  const base = env.MAILGUN_API_BASE === 'https://api.eu.mailgun.net' ? env.MAILGUN_API_BASE : 'https://api.mailgun.net';
  const res = await fetch(`${base}/v3/${env.MAILGUN_DOMAIN}/messages`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + btoa(`api:${env.MAILGUN_API_KEY}`),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });
  return res.ok;
}

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return reply(request, 403, { error: 'origin' });

  const length = parseInt(request.headers.get('content-length') || '0', 10);
  if (length > MAX_BODY_BYTES) return reply(request, 413, { error: 'too-large' });

  const type = request.headers.get('content-type') || '';
  if (!type.includes('multipart/form-data') && !type.includes('application/x-www-form-urlencoded')) {
    return reply(request, 400, { error: 'content-type', fields: [] });
  }
  const data = await request.formData().catch(() => null);
  if (!data) return reply(request, 400, { error: 'payload', fields: [] });

  // Honeypot: bots fill the hidden field. Pretend success, deliver nothing.
  if (String(data.get('website') || '').trim() !== '') return reply(request, 200, { ok: true });

  const entry = {
    name: clean(data.get('name'), 120),
    email: clean(data.get('email'), 200),
    platform: String(data.get('platform') || ''),
    consent: data.get('consent') === 'yes',
    at: new Date().toISOString(),
  };
  const bad = [];
  if (!entry.name) bad.push('name');
  if (!EMAIL_RE.test(entry.email)) bad.push('email');
  if (!PLATFORMS.has(entry.platform)) bad.push('platform');
  if (!entry.consent) bad.push('consent');
  if (bad.length) return reply(request, 400, { error: 'validation', fields: bad });

  const ip = request.headers.get('cf-connecting-ip') || '';
  if (await rateLimited(env, ip)) return reply(request, 429, { error: 'rate' });

  const human = await verifyTurnstile(env, String(data.get('cf-turnstile-response') || ''), ip);
  if (!human) return reply(request, 403, { error: 'turnstile' });

  try {
    const sent = await deliver(env, entry);
    if (!sent) return reply(request, 502, { error: 'delivery' });
  } catch (err) {
    console.error('early-access delivery failed', err && err.message);
    return reply(request, 502, { error: 'delivery' });
  }
  return reply(request, 200, { ok: true });
}

export async function onRequest({ request }) {
  return new Response(JSON.stringify({ error: 'Method not allowed. Use POST.' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json', Allow: 'POST', 'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex' },
  });
}
