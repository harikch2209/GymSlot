// Verifies a Razorpay payment signature server-side, then creates the booking
// (via the user-scoped create_booking RPC) and finalises the payment record.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET') ?? '';
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

async function hmacHex(secret: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(msg));
  return [...new Uint8Array(sig)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const auth = req.headers.get('Authorization') ?? '';
    const user = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: auth } } });
    const { data: { user: u } } = await user.auth.getUser();
    if (!u) return json({ error: 'not authenticated' }, 401);
    if (!KEY_SECRET) return json({ error: 'Payments not configured: set RAZORPAY_KEY_SECRET.' }, 400);

    const { orderId, paymentId, signature } = await req.json();
    const admin = createClient(SUPABASE_URL, SERVICE);

    // Verify the signature exactly as Razorpay specifies: HMAC(order_id|payment_id).
    const expected = await hmacHex(KEY_SECRET, `${orderId}|${paymentId}`);
    if (expected !== signature) {
      await admin.from('payments').update({ status: 'failed' }).eq('razorpay_order_id', orderId);
      return json({ error: 'payment signature verification failed' }, 400);
    }

    const { data: pay } = await admin.from('payments').select('*').eq('razorpay_order_id', orderId).maybeSingle();
    if (!pay) return json({ error: 'payment not found' }, 404);
    if (pay.user_id !== u.id) return json({ error: 'not your payment' }, 403);
    if (pay.status === 'paid' && pay.booking_id) return json({ bookingId: pay.booking_id });

    // Create the booking with the server-recorded amounts (user-scoped RPC).
    const { data: booking, error: bErr } = await user.rpc('create_booking', {
      p_kind: pay.kind, p_gym_id: pay.gym_id, p_gym_name: pay.gym_name, p_title: pay.title,
      p_booking_date: pay.booking_date, p_time: pay.time, p_duration_mins: pay.duration_mins,
      p_amount_paid: pay.amount, p_credits_used: pay.credits_used,
      p_slot_id: pay.slot_id, p_event_id: pay.event_id, p_trainer_id: pay.trainer_id, p_trainer_name: pay.trainer_name,
    });
    if (bErr) return json({ error: bErr.message }, 400);

    await admin.from('payments')
      .update({ status: 'paid', razorpay_payment_id: paymentId, booking_id: (booking as { id: string }).id })
      .eq('razorpay_order_id', orderId);

    return json({ bookingId: (booking as { id: string }).id });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'unexpected error' }, 500);
  }
});
