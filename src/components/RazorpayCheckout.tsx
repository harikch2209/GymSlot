import React from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '@/theme';
import { AppText, Ionicons } from './ui';

export interface RazorpayOptions {
  orderId: string;
  amount: number; // INR (rupees)
  keyId: string;
  description: string;
  email?: string;
  name?: string;
}

export interface RazorpaySuccess { paymentId: string; orderId: string; signature: string }

function buildHtml(o: RazorpayOptions): string {
  const esc = (s: string) => s.replace(/'/g, "\\'");
  return `<!doctype html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
<style>html,body{height:100%;margin:0;background:#0E1116;display:flex;align-items:center;justify-content:center;font-family:-apple-system,sans-serif;color:#fff}</style>
</head><body>
<div>Opening secure checkout…</div>
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
<script>
  function post(o){ if(window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(o)); }
  var opts = {
    key: '${esc(o.keyId)}', order_id: '${esc(o.orderId)}', amount: ${Math.round(o.amount * 100)}, currency: 'INR',
    name: 'GymSlot', description: '${esc(o.description)}',
    prefill: { email: '${esc(o.email ?? '')}', name: '${esc(o.name ?? '')}' },
    theme: { color: '#10B981' },
    handler: function(r){ post({ type:'success', paymentId: r.razorpay_payment_id, orderId: r.razorpay_order_id, signature: r.razorpay_signature }); },
    modal: { ondismiss: function(){ post({ type:'dismiss' }); }, escape: true, backdropclose: false }
  };
  try {
    var rzp = new Razorpay(opts);
    rzp.on('payment.failed', function(r){ post({ type:'failed', message: (r.error && r.error.description) || 'Payment failed' }); });
    rzp.open();
  } catch (e) { post({ type:'failed', message: String(e) }); }
</script>
</body></html>`;
}

export function RazorpayCheckout({
  visible, options, onSuccess, onDismiss, onError,
}: {
  visible: boolean;
  options: RazorpayOptions | null;
  onSuccess: (r: RazorpaySuccess) => void;
  onDismiss: () => void;
  onError: (msg: string) => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible && !!options} animationType="slide" onRequestClose={onDismiss}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.bar}>
          <Ionicons name="lock-closed" size={14} color={colors.onPrimary} />
          <AppText variant="smallStrong" color={colors.onPrimary}>Secure payment · Razorpay</AppText>
        </View>
        {options && (
          <WebView
            originWhitelist={['*']}
            source={{ html: buildHtml(options) }}
            javaScriptEnabled
            domStorageEnabled
            onMessage={(e) => {
              try {
                const msg = JSON.parse(e.nativeEvent.data);
                if (msg.type === 'success') onSuccess({ paymentId: msg.paymentId, orderId: msg.orderId, signature: msg.signature });
                else if (msg.type === 'dismiss') onDismiss();
                else if (msg.type === 'failed') onError(msg.message ?? 'Payment failed');
              } catch { /* ignore malformed */ }
            }}
            style={{ flex: 1, backgroundColor: colors.ink }}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: spacing.md, backgroundColor: colors.ink },
});
