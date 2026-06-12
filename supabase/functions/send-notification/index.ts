// Outbound delivery for a single in-app notification: fans it out to the
// recipient's push tokens (Expo Push) and, if enabled, SMS/WhatsApp (Twilio).
// Code-complete but degrades gracefully — with no push tokens and no Twilio
// secrets it simply no-ops; the in-app record already exists. Invoked only by
// the DB worker (flush_outbound_notifications) using the service-role key.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Twilio (optional). Absent → SMS/WhatsApp silently skipped.
const TWILIO_SID = Deno.env.get('TWILIO_ACCOUNT_SID') ?? '';
const TWILIO_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN') ?? '';
const TWILIO_FROM = Deno.env.get('TWILIO_FROM') ?? '';                 // SMS sender (e.g. +1415...)
const TWILIO_WHATSAPP_FROM = Deno.env.get('TWILIO_WHATSAPP_FROM') ?? ''; // e.g. whatsapp:+1415...

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

// Sends to Expo and inspects per-ticket outcomes: a 200 with all-error tickets
// is NOT success. Returns ok (>=1 delivered) plus any DeviceNotRegistered tokens
// to prune so dead tokens don't accumulate.
async function sendExpoPush(tokens: string[], title: string, body: string, data: unknown) {
  const valid = tokens.filter((t) => t.startsWith('ExponentPushToken') || t.startsWith('ExpoPushToken'));
  if (valid.length === 0) return { ok: false, dead: [] as string[] };
  const messages = valid.map((to) => ({ to, title, body, sound: 'default', data }));
  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(messages),
  });
  if (!res.ok) return { ok: false, dead: [] as string[] };
  let tickets: { status?: string; details?: { error?: string } }[] = [];
  try {
    const jsonBody = await res.json();
    tickets = jsonBody?.data ?? [];
  } catch {
    return { ok: true, dead: [] as string[] }; // transport ok, body unreadable
  }
  const dead: string[] = [];
  let anyOk = false;
  tickets.forEach((t, i) => {
    if (t?.status === 'ok') anyOk = true;
    else if (t?.details?.error === 'DeviceNotRegistered') dead.push(valid[i]);
  });
  return { ok: anyOk, dead };
}

async function sendTwilio(to: string, body: string, channel: 'sms' | 'whatsapp') {
  if (!TWILIO_SID || !TWILIO_TOKEN) return false;
  const from = channel === 'whatsapp' ? TWILIO_WHATSAPP_FROM : TWILIO_FROM;
  if (!from) return false;
  const dest = channel === 'whatsapp' ? `whatsapp:${to}` : to;
  const form = new URLSearchParams({ To: dest, From: from, Body: body });
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  });
  return res.ok;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    // Only the DB worker (service-role key) may trigger delivery.
    const auth = req.headers.get('Authorization') ?? '';
    if (auth !== `Bearer ${SERVICE}`) return json({ error: 'forbidden' }, 403);

    const { notification_id } = await req.json();
    if (!notification_id) return json({ error: 'notification_id required' }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE);
    const { data: n } = await admin.from('notifications').select('*').eq('id', notification_id).maybeSingle();
    if (!n) return json({ error: 'notification not found' }, 404);

    const channels: string[] = n.channels ?? [];
    let pushOk = false; let smsOk = false;

    if (channels.includes('push')) {
      const { data: toks } = await admin.from('push_tokens').select('token').eq('user_id', n.user_id);
      const tokens = (toks ?? []).map((t: { token: string }) => t.token);
      const r = await sendExpoPush(tokens, n.title, n.body, n.data);
      pushOk = r.ok;
      // Prune tokens Expo reports as no longer registered.
      for (const dead of r.dead) {
        await admin.from('push_tokens').delete().eq('user_id', n.user_id).eq('token', dead);
      }
    }
    if (channels.includes('sms')) {
      const { data: prof } = await admin.from('profiles').select('phone').eq('id', n.user_id).maybeSingle();
      const phone = prof?.phone as string | undefined;
      if (phone) {
        const text = `${n.title}\n${n.body}`;
        // Prefer WhatsApp if configured, else SMS.
        smsOk = TWILIO_WHATSAPP_FROM
          ? await sendTwilio(phone, text, 'whatsapp')
          : await sendTwilio(phone, text, 'sms');
      }
    }

    // Record delivery outcome WITHOUT clobbering the in-app read lifecycle:
    // never resurrect a notification the user already read (status='read').
    const status = channels.some((c) => c === 'push' || c === 'sms') && !pushOk && !smsOk ? 'failed' : 'sent';
    await admin.from('notifications')
      .update({ status, dispatched_at: new Date().toISOString() })
      .eq('id', notification_id)
      .neq('status', 'read');

    return json({ pushOk, smsOk, status });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'unexpected error' }, 500);
  }
});
