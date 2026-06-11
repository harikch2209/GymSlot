// Creates a Razorpay order. The payable amount is computed server-side from the
// catalog so the client cannot tamper with prices. Records a pending payment row.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const KEY_ID = Deno.env.get('RAZORPAY_KEY_ID') ?? 'rzp_test_T08abvuDeDF2AY';
const KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET') ?? '';
const COMMISSION_RATE = 0.15;

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const auth = req.headers.get('Authorization') ?? '';
    const user = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: auth } } });
    const { data: { user: u } } = await user.auth.getUser();
    if (!u) return json({ error: 'not authenticated' }, 401);
    if (!KEY_SECRET) return json({ error: 'Payments not configured: set RAZORPAY_KEY_SECRET as a Supabase secret.' }, 400);

    const b = await req.json();
    const kind: 'slot' | 'event' = b.kind;
    let total = 0;

    if (kind === 'slot') {
      const { data: slot } = await user.from('slots').select('price,duration').eq('id', b.slotId).maybeSingle();
      if (!slot) return json({ error: 'slot not found' }, 400);
      total = slot.price;
      if (b.trainerId) {
        const { data: t } = await user.from('trainers').select('fee_30,fee_60').eq('id', b.trainerId).maybeSingle();
        if (t) total += slot.duration === 30 ? t.fee_30 : t.fee_60;
      }
    } else if (kind === 'event') {
      const { data: ev } = await user.from('events').select('price').eq('id', b.eventId).maybeSingle();
      if (!ev) return json({ error: 'event not found' }, 400);
      total = ev.price;
    } else {
      return json({ error: 'invalid kind' }, 400);
    }

    const { data: balance } = await user.rpc('credit_balance');
    const creditsApplied = Math.max(0, Math.min(Number(b.creditsToUse ?? 0), balance ?? 0, total));
    const payable = total - creditsApplied;
    if (payable <= 0) return json({ error: 'no payment required (covered by credits)' }, 400);

    // Create the Razorpay order (amount in paise).
    const orderRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { Authorization: 'Basic ' + btoa(`${KEY_ID}:${KEY_SECRET}`), 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: payable * 100, currency: 'INR', receipt: `gs_${u.id.slice(0, 8)}_${Date.now()}`, notes: { kind, gym: b.gymName ?? '' } }),
    });
    const order = await orderRes.json();
    if (!orderRes.ok) return json({ error: order?.error?.description ?? 'Razorpay order failed' }, 400);

    const commission = Math.round(payable * COMMISSION_RATE);
    const admin = createClient(SUPABASE_URL, SERVICE);
    await admin.from('payments').insert({
      user_id: u.id, razorpay_order_id: order.id, kind,
      gym_id: b.gymId ?? null, gym_name: b.gymName ?? null, slot_id: b.slotId ?? null, event_id: b.eventId ?? null,
      trainer_id: b.trainerId ?? null, trainer_name: b.trainerName ?? null,
      title: b.title, booking_date: b.day, time: b.time, duration_mins: b.durationMins,
      amount: payable, credits_used: creditsApplied, commission, gym_payout: payable - commission, status: 'created',
    });

    return json({ orderId: order.id, amount: payable, creditsApplied, keyId: KEY_ID, currency: 'INR' });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'unexpected error' }, 500);
  }
});
