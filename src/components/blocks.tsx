import React, { ReactNode, useEffect, useRef } from 'react';
import {
  I18nManager,
  Pressable,
  StyleProp,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import {
  chevronForward,
  colors,
  gradients,
  radius,
  shadow,
  spacing,
  textStart,
  toneColors,
  type,
  type Tone,
} from '../theme';
import { Tap } from './motion';
import { type IconName } from './ui';

/**
 * Composite blocks built on the primitives in ui.tsx: hero cards, stat cards,
 * quick-action tiles, list rows, progress, steppers, timelines and the OTP
 * input. Screens assemble these rather than styling from scratch.
 */

type Gradient = readonly [string, string, ...string[]];

/** Gradient card with soft decorative orbs. Used for the top of each home screen. */
export const Hero = ({
  children,
  gradient = gradients.hero,
  style,
  padded = true,
}: {
  children: ReactNode;
  gradient?: Gradient;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}) => (
  <LinearGradient
    colors={gradient}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={[styles.hero, padded && styles.heroPadded, style]}
  >
    <View style={[styles.orb, styles.orbA]} pointerEvents="none" />
    <View style={[styles.orb, styles.orbB]} pointerEvents="none" />
    {children}
  </LinearGradient>
);

export const StatCard = ({
  label,
  value,
  icon,
  tone = 'info',
  hint,
  onPress,
  style,
  index = 0,
}: {
  label: string;
  value: string | number;
  icon: IconName;
  tone?: Tone;
  hint?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  index?: number;
}) => {
  const palette = toneColors[tone];
  const content = (
    <>
      <View style={styles.statTop}>
        <View style={[styles.statIcon, { backgroundColor: palette.bg }]}>
          <Ionicons name={icon} size={17} color={palette.fg} />
        </View>
        {!!onPress && <Ionicons name={chevronForward()} size={14} color={colors.placeholder} />}
      </View>
      <Text style={[type.amount, textStart(), styles.statValue]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[type.caption, textStart()]} numberOfLines={1}>
        {label}
      </Text>
      {!!hint && (
        <Text style={[type.tiny, textStart(), { color: palette.fg }, styles.statHint]} numberOfLines={1}>
          {hint}
        </Text>
      )}
    </>
  );

  if (onPress) {
    return (
      <Tap onPress={onPress} style={[styles.stat, style]} accessibilityRole="button">
        {content}
      </Tap>
    );
  }
  return <View style={[styles.stat, style]}>{content}</View>;
};

/** Square quick-action tile for the home grids. */
export const Tile = ({
  label,
  icon,
  tone = 'info',
  onPress,
  badge,
  style,
  description,
}: {
  label: string;
  icon: IconName;
  tone?: Tone;
  onPress: () => void;
  badge?: string;
  style?: StyleProp<ViewStyle>;
  description?: string;
}) => {
  const palette = toneColors[tone];
  return (
    <Tap onPress={onPress} style={[styles.tile, style]} accessibilityRole="button">
      <View style={styles.tileTop}>
        <View style={[styles.tileIcon, { backgroundColor: palette.bg }]}>
          <Ionicons name={icon} size={20} color={palette.fg} />
        </View>
        {!!badge && (
          <View style={styles.tileBadge}>
            <Text style={styles.tileBadgeText}>{badge}</Text>
          </View>
        )}
      </View>
      <Text style={[type.subheading, textStart(), styles.tileLabel]} numberOfLines={2}>
        {label}
      </Text>
      {!!description && (
        <Text style={[type.caption, textStart()]} numberOfLines={2}>
          {description}
        </Text>
      )}
    </Tap>
  );
};

/** Row with a tinted icon, two lines of text and a trailing element or chevron. */
export const ListRow = ({
  icon,
  iconTone = 'info',
  leading,
  title,
  subtitle,
  meta,
  trailing,
  chevron,
  onPress,
  style,
  compact,
}: {
  icon?: IconName;
  iconTone?: Tone;
  leading?: ReactNode;
  title: string;
  subtitle?: string;
  meta?: string;
  trailing?: ReactNode;
  chevron?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}) => {
  const palette = toneColors[iconTone];
  const showChevron = chevron ?? !!onPress;
  const content = (
    <>
      {leading ??
        (icon ? (
          <View style={[styles.rowIcon, { backgroundColor: palette.bg }]}>
            <Ionicons name={icon} size={18} color={palette.fg} />
          </View>
        ) : null)}
      <View style={styles.rowText}>
        <Text style={[type.bodyStrong, textStart()]} numberOfLines={1}>
          {title}
        </Text>
        {!!subtitle && (
          <Text style={[type.caption, textStart()]} numberOfLines={2}>
            {subtitle}
          </Text>
        )}
        {!!meta && (
          <Text style={[type.tiny, textStart(), styles.rowMeta]} numberOfLines={1}>
            {meta}
          </Text>
        )}
      </View>
      {trailing}
      {showChevron && <Ionicons name={chevronForward()} size={16} color={colors.placeholder} />}
    </>
  );
  const rowStyle = [styles.row, compact && styles.rowCompact, style];
  if (onPress) {
    return (
      <Tap onPress={onPress} style={rowStyle} scale={0.985} accessibilityRole="button">
        {content}
      </Tap>
    );
  }
  return <View style={rowStyle}>{content}</View>;
};

export const Avatar = ({
  name,
  size = 44,
  gradient = gradients.primary,
  style,
}: {
  name: string;
  size?: number;
  gradient?: Gradient;
  style?: StyleProp<ViewStyle>;
}) => {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
  return (
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.avatar, { width: size, height: size }, style]}
    >
      <Text style={[styles.avatarText, { fontSize: Math.round(size * 0.36) }]}>{initials || '•'}</Text>
    </LinearGradient>
  );
};

/** Animated horizontal progress. `value` is 0..1. */
export const ProgressBar = ({
  value,
  tone = 'info',
  height = 8,
  track,
  style,
}: {
  value: number;
  tone?: Tone;
  height?: number;
  track?: string;
  style?: StyleProp<ViewStyle>;
}) => {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(Math.max(0, Math.min(1, value)), { duration: 600 });
  }, [value, progress]);
  const fill = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  return (
    <View style={[styles.track, { height, backgroundColor: track ?? colors.surfaceAlt }, style]}>
      <Animated.View style={[styles.fill, { backgroundColor: toneColors[tone].fg }, fill]} />
    </View>
  );
};

/** Pulsing placeholder used while a query loads. */
export const Skeleton = ({
  width = '100%',
  height = 16,
  radius: r = radius.sm,
  style,
}: {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) => {
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.45, { duration: 800 }), -1, true);
  }, [opacity]);
  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[styles.skeleton, { width, height, borderRadius: r }, animated, style]} />;
};

/** Numbered horizontal steps for multi-page forms. */
export const Stepper = ({ steps, current }: { steps: string[]; current: number }) => (
  <View style={styles.stepper}>
    {steps.map((label, index) => {
      const done = index < current;
      const active = index === current;
      return (
        <View key={label} style={styles.step}>
          <View style={styles.stepTop}>
            <View style={[styles.stepDot, (done || active) && styles.stepDotActive, done && styles.stepDotDone]}>
              {done ? (
                <Ionicons name="checkmark" size={12} color={colors.white} />
              ) : (
                <Text style={[styles.stepNumber, active && styles.stepNumberActive]}>{index + 1}</Text>
              )}
            </View>
            {index < steps.length - 1 && <View style={[styles.stepLine, done && styles.stepLineDone]} />}
          </View>
          <Text style={[type.tiny, active && styles.stepLabelActive]} numberOfLines={1}>
            {label}
          </Text>
        </View>
      );
    })}
  </View>
);

export type TimelineItem = {
  title: string;
  subtitle?: string;
  date?: string;
  state: 'done' | 'current' | 'pending';
};

/** Vertical status history (request tracking, complaint follow-up). */
export const Timeline = ({ items }: { items: TimelineItem[] }) => (
  <View>
    {items.map((item, index) => {
      const last = index === items.length - 1;
      const dotStyle =
        item.state === 'done'
          ? styles.tlDotDone
          : item.state === 'current'
            ? styles.tlDotCurrent
            : styles.tlDotPending;
      return (
        <View key={`${item.title}-${index}`} style={styles.tlRow}>
          <View style={styles.tlRail}>
            <View style={[styles.tlDot, dotStyle]}>
              {item.state === 'done' && <Ionicons name="checkmark" size={10} color={colors.white} />}
            </View>
            {!last && <View style={[styles.tlLine, item.state === 'done' && styles.tlLineDone]} />}
          </View>
          <View style={[styles.tlBody, last && styles.tlBodyLast]}>
            <Text
              style={[
                type.bodyStrong,
                textStart(),
                item.state === 'pending' && { color: colors.textSubtle },
              ]}
            >
              {item.title}
            </Text>
            {!!item.subtitle && (
              <Text style={[type.caption, textStart()]}>{item.subtitle}</Text>
            )}
            {!!item.date && (
              <Text style={[type.tiny, textStart(), styles.tlDate]}>{item.date}</Text>
            )}
          </View>
        </View>
      );
    })}
  </View>
);

/** Six-box one-time-code input backed by a single hidden TextInput. */
export const OtpInput = ({
  length = 6,
  value,
  onChange,
  error,
  autoFocus,
  onComplete,
}: {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
  autoFocus?: boolean;
  onComplete?: (code: string) => void;
}) => {
  const ref = useRef<React.ComponentRef<typeof TextInput>>(null);
  const digits = value.split('');

  return (
    <Pressable
      onPress={() => ref.current?.focus()}
      style={[styles.otpRow, { flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row' }]}
    >
      {Array.from({ length }).map((_, index) => {
        const active = index === Math.min(value.length, length - 1) && value.length < length;
        return (
          <View
            key={index}
            style={[
              styles.otpBox,
              active && styles.otpBoxActive,
              !!digits[index] && styles.otpBoxFilled,
              error && styles.otpBoxError,
            ]}
          >
            <Text style={styles.otpDigit}>{digits[index] ?? ''}</Text>
            {active && <View style={styles.otpCaret} />}
          </View>
        );
      })}
      <TextInput
        ref={ref}
        value={value}
        onChangeText={(text) => {
          const clean = text.replace(/\D/g, '').slice(0, length);
          onChange(clean);
          if (clean.length === length) onComplete?.(clean);
        }}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={length}
        autoFocus={autoFocus}
        caretHidden
        style={styles.otpHidden}
      />
    </Pressable>
  );
};

export const Toggle = ({
  label,
  description,
  value,
  onValueChange,
  icon,
  iconTone = 'info',
}: {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  icon?: IconName;
  iconTone?: Tone;
}) => (
  <ListRow
    icon={icon}
    iconTone={iconTone}
    title={label}
    subtitle={description}
    chevron={false}
    trailing={
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor={colors.white}
      />
    }
  />
);

const styles = StyleSheet.create({
  hero: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    ...shadow.accent,
  },
  heroPadded: { padding: spacing(5) },
  orb: { position: 'absolute', borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.10)' },
  orbA: { width: 180, height: 180, top: -70, right: -50 },
  orbB: { width: 120, height: 120, bottom: -60, left: -20, backgroundColor: 'rgba(255,255,255,0.07)' },

  stat: {
    flex: 1,
    minWidth: 140,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(3.5),
    gap: 2,
    ...shadow.card,
  },
  statTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing(2.5) },
  statIcon: { width: 34, height: 34, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  statValue: { marginBottom: 1 },
  statHint: { marginTop: 3 },

  tile: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(3.5),
    gap: spacing(1),
    ...shadow.card,
  },
  tileTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: spacing(2) },
  tileIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  tileBadge: { backgroundColor: colors.dangerSoft, borderRadius: radius.pill, paddingHorizontal: 7, paddingVertical: 2 },
  tileBadgeText: { fontSize: 10.5, fontFamily: 'Inter_700Bold', color: colors.danger },
  tileLabel: { marginTop: 2 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(3),
    paddingVertical: spacing(3),
  },
  rowCompact: { paddingVertical: spacing(2) },
  rowIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, gap: 1 },
  rowMeta: { marginTop: 2 },

  avatar: { borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.white, fontFamily: 'Inter_700Bold', letterSpacing: 0.5 },

  track: { width: '100%', borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },

  skeleton: { backgroundColor: colors.surfaceAlt },

  stepper: { flexDirection: 'row', marginBottom: spacing(5) },
  step: { flex: 1, gap: 6 },
  stepTop: { flexDirection: 'row', alignItems: 'center' },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: { backgroundColor: colors.primarySoft, borderWidth: 2, borderColor: colors.primary },
  stepDotDone: { backgroundColor: colors.primary, borderWidth: 0 },
  stepNumber: { fontSize: 11, fontFamily: 'Inter_700Bold', color: colors.textSubtle },
  stepNumberActive: { color: colors.primary },
  stepLine: { flex: 1, height: 2, backgroundColor: colors.border, marginHorizontal: 6 },
  stepLineDone: { backgroundColor: colors.primary },
  stepLabelActive: { color: colors.primary },

  tlRow: { flexDirection: 'row', gap: spacing(3) },
  tlRail: { alignItems: 'center', width: 20 },
  tlDot: { width: 18, height: 18, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  tlDotDone: { backgroundColor: colors.success },
  tlDotCurrent: { backgroundColor: colors.primarySoft, borderWidth: 3, borderColor: colors.primary },
  tlDotPending: { backgroundColor: colors.surfaceAlt, borderWidth: 2, borderColor: colors.border },
  tlLine: { flex: 1, width: 2, backgroundColor: colors.border, marginVertical: 3 },
  tlLineDone: { backgroundColor: colors.success },
  tlBody: { flex: 1, paddingBottom: spacing(5), gap: 2 },
  tlBodyLast: { paddingBottom: 0 },
  tlDate: { marginTop: 2 },

  otpRow: { justifyContent: 'space-between', gap: spacing(2) },
  otpBox: {
    flex: 1,
    height: 58,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  otpBoxFilled: { borderColor: colors.text },
  otpBoxError: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
  otpDigit: { fontSize: 22, fontFamily: 'Inter_700Bold', color: colors.text },
  otpCaret: { position: 'absolute', bottom: 12, width: 14, height: 2, borderRadius: 1, backgroundColor: colors.primary },
  otpHidden: { position: 'absolute', opacity: 0, width: 1, height: 1 },
});
