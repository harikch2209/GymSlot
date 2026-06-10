import React from 'react';
import {
  ActivityIndicator, Pressable, StyleSheet, Text, TextInput, TextProps,
  TextStyle, View, ViewStyle, TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, radius, shadow, spacing, type as T } from '@/theme';

export { Ionicons } from '@expo/vector-icons';

type TypeToken = keyof typeof T;

/** Text that applies a type-scale token + color. Use everywhere instead of raw <Text>. */
export function AppText({
  variant = 'body', color = colors.text, style, children, ...rest
}: TextProps & { variant?: TypeToken; color?: string }) {
  return (
    <Text {...rest} style={[T[variant], { color }, style]}>
      {children}
    </Text>
  );
}

export function Screen({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.screen, style]}>{children}</View>;
}

export function Card({
  children, style, padded = true,
}: { children: React.ReactNode; style?: ViewStyle; padded?: boolean }) {
  return <View style={[styles.card, padded && { padding: spacing.lg }, style]}>{children}</View>;
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dark';
type ButtonSize = 'sm' | 'md' | 'lg';

export function Button({
  title, onPress, variant = 'primary', size = 'lg', disabled, loading, icon, style, fullWidth, fg: fgOverride,
}: {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
  fullWidth?: boolean;
  /** Override foreground (text/icon) color — handy for ghost buttons on dark art. */
  fg?: string;
}) {
  const palette: Record<ButtonVariant, { bg: string; fg: string; border?: string }> = {
    primary: { bg: colors.primary, fg: colors.onPrimary },
    dark: { bg: colors.ink, fg: colors.onDark },
    danger: { bg: colors.danger, fg: '#fff' },
    secondary: { bg: colors.surfaceAlt, fg: colors.text },
    ghost: { bg: 'transparent', fg: colors.text, border: colors.borderStrong },
  };
  const p = { ...palette[variant], fg: fgOverride ?? palette[variant].fg };
  const h = size === 'sm' ? 40 : size === 'md' ? 48 : 54;
  const handle = () => {
    if (disabled || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress?.();
  };
  return (
    <Pressable
      onPress={handle}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      accessibilityLabel={title}
      style={({ pressed }) => [
        styles.button,
        {
          height: h,
          backgroundColor: p.bg,
          borderWidth: p.border ? 1.5 : 0,
          borderColor: p.border,
          opacity: disabled ? 0.45 : pressed ? 0.9 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
        variant === 'primary' && !disabled && shadow.sm,
        fullWidth && { alignSelf: 'stretch' },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={p.fg} />
      ) : (
        <View style={styles.buttonInner}>
          {icon && <Ionicons name={icon} size={size === 'sm' ? 16 : 19} color={p.fg} />}
          <Text style={[T.bodyStrong, { color: p.fg, fontSize: size === 'sm' ? 14 : 16 }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

/** Small status/label chip. */
export function Badge({
  label, color = colors.text, bg = colors.surfaceAlt, icon, style,
}: {
  label: string; color?: string; bg?: string;
  icon?: keyof typeof Ionicons.glyphMap; style?: ViewStyle;
}) {
  return (
    <View style={[styles.badge, { backgroundColor: bg }, style]}>
      {icon && <Ionicons name={icon} size={12} color={color} />}
      <Text style={[T.tiny, { color }]}>{label}</Text>
    </View>
  );
}

/** Selectable filter chip. */
export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  return (
    <Pressable
      onPress={() => { Haptics.selectionAsync().catch(() => {}); onPress?.(); }}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[T.smallStrong, { color: active ? colors.onPrimary : colors.textMuted }]}>{label}</Text>
    </Pressable>
  );
}

export function Field({
  label, error, icon, style, ...rest
}: TextInputProps & {
  label?: string; error?: string | null; icon?: keyof typeof Ionicons.glyphMap; style?: ViewStyle;
}) {
  return (
    <View style={style}>
      {label && <Text style={[T.smallStrong, { color: colors.textMuted, marginBottom: 6 }]}>{label}</Text>}
      <View style={[styles.field, error && { borderColor: colors.danger }]}>
        {icon && <Ionicons name={icon} size={18} color={colors.textSubtle} style={{ marginRight: 8 }} />}
        <TextInput
          placeholderTextColor={colors.textSubtle}
          style={[T.body, { flex: 1, color: colors.text, paddingVertical: 14 }]}
          {...rest}
        />
      </View>
      {!!error && <Text style={[T.small, { color: colors.danger, marginTop: 5 }]}>{error}</Text>}
    </View>
  );
}

export function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const init = name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || 'GS';
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[T.h3, { color: colors.onPrimary, fontSize: size * 0.38 }]}>{init}</Text>
    </View>
  );
}

export function Stars({ rating, reviews }: { rating: number; reviews?: number }) {
  return (
    <View style={styles.row}>
      <Ionicons name="star" size={13} color={colors.star} />
      <Text style={[T.smallStrong, { color: colors.text, marginLeft: 3 }]}>{rating.toFixed(1)}</Text>
      {reviews !== undefined && (
        <Text style={[T.small, { color: colors.textSubtle, marginLeft: 4 }]}>({reviews})</Text>
      )}
    </View>
  );
}

export function Divider({ style }: { style?: ViewStyle }) {
  return <View style={[styles.divider, style]} />;
}

export function SectionHeader({
  title, action, onAction,
}: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={T.h2}>{title}</Text>
      {action && (
        <Pressable onPress={onAction} accessibilityRole="button">
          <Text style={[T.smallStrong, { color: colors.primary }]}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

export function EmptyState({
  icon = 'sparkles-outline', title, body, action, onAction,
}: {
  icon?: keyof typeof Ionicons.glyphMap; title: string; body?: string;
  action?: string; onAction?: () => void;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={30} color={colors.primary} />
      </View>
      <Text style={[T.h3, { textAlign: 'center' }]}>{title}</Text>
      {body && <Text style={[T.small, { color: colors.textMuted, textAlign: 'center', marginTop: 6 }]}>{body}</Text>}
      {action && <Button title={action} onPress={onAction} style={{ marginTop: spacing.lg, alignSelf: 'stretch' }} />}
    </View>
  );
}

/** Shimmer-free skeleton block. */
export function Skeleton({ height = 16, width, radius: r = radius.sm, style }: {
  height?: number; width?: number | string; radius?: number; style?: ViewStyle;
}) {
  return <View style={[{ height, width: (width as any) ?? '100%', borderRadius: r, backgroundColor: colors.surfaceSunken }, style]} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgSubtle },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, ...shadow.sm },
  button: { borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },
  buttonInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
    paddingHorizontal: 9, paddingVertical: 5, borderRadius: radius.pill,
  },
  chip: {
    paddingHorizontal: spacing.lg, paddingVertical: 9, borderRadius: radius.pill,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  field: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: spacing.md,
  },
  avatar: { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  empty: { alignItems: 'center', paddingHorizontal: spacing.xl, paddingVertical: spacing.xxl },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primaryTint,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg,
  },
});
