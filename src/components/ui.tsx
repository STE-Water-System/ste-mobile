import React, { ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import {
  chevronBack,
  colors,
  hitSlop,
  radius,
  shadow,
  spacing,
  textStart,
  textEnd,
  toneColors,
  type,
  type Tone,
} from '../theme';
import { Tap } from './motion';

export type { Tone };
export type IconName = React.ComponentProps<typeof Ionicons>['name'];

/**
 * Shared primitives. Every screen is composed from these so the Agent and
 * Customer spaces share one visual language: a slate canvas, white cards with a
 * soft shadow, pill-shaped controls and a single blue accent.
 */

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export const Screen = ({
  children,
  scroll = false,
  style,
  refreshing,
  onRefresh,
  keyboard = false,
  edges = ['top', 'left', 'right'],
}: {
  children: ReactNode;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
  refreshing?: boolean;
  onRefresh?: () => void;
  keyboard?: boolean;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}) => {
  const body = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.scrollBody, style]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      scrollEventThrottle={16}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={!!refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.body, style]}>{children}</View>
  );

  return (
    <SafeAreaView style={styles.screen} edges={edges}>
      {keyboard ? (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {body}
        </KeyboardAvoidingView>
      ) : (
        body
      )}
    </SafeAreaView>
  );
};

/** Page title. `onBack` adds a round back button on the start edge; `action` sits on the end edge. */
export const Header = ({
  title,
  subtitle,
  eyebrow,
  action,
  onBack,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  action?: ReactNode;
  onBack?: () => void;
}) => (
  <View style={styles.header}>
    {!!onBack && <IconButton icon={chevronBack()} onPress={onBack} accessibilityLabel="back" />}
    <View style={styles.headerText}>
      {!!eyebrow && (
        <Text style={[type.tiny, textStart(), styles.headerEyebrow]} numberOfLines={1}>
          {eyebrow.toUpperCase()}
        </Text>
      )}
      <Text style={[type.title, textStart()]} numberOfLines={1}>
        {title}
      </Text>
      {!!subtitle && (
        <Text style={[type.caption, textStart(), styles.headerSubtitle]} numberOfLines={1}>
          {subtitle}
        </Text>
      )}
    </View>
    {action}
  </View>
);

export const IconButton = ({
  icon,
  onPress,
  tone = 'neutral',
  variant = 'soft',
  size = 38,
  accessibilityLabel,
  style,
  badge,
}: {
  icon: IconName;
  onPress: () => void;
  tone?: Tone;
  variant?: 'soft' | 'ghost' | 'primary' | 'white';
  size?: number;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  badge?: number;
}) => {
  const palette = toneColors[tone];
  const background =
    variant === 'primary'
      ? colors.primary
      : variant === 'white'
        ? colors.white
        : variant === 'ghost'
          ? 'transparent'
          : palette.bg;
  const color = variant === 'primary' ? colors.white : variant === 'white' ? colors.text : palette.fg;

  return (
    <Tap
      onPress={onPress}
      hitSlop={hitSlop}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.iconButton,
        { width: size, height: size, backgroundColor: background },
        variant === 'white' && shadow.soft,
        style,
      ]}
    >
      <Ionicons name={icon} size={Math.round(size * 0.5)} color={color} />
      {!!badge && badge > 0 && (
        <View style={styles.iconBadge}>
          <Text style={styles.iconBadgeText}>{badge > 9 ? '9+' : badge}</Text>
        </View>
      )}
    </Tap>
  );
};

export const Card = ({
  children,
  style,
  onPress,
  padded = true,
  tone,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  padded?: boolean;
  tone?: Tone;
}) => {
  const base = [
    styles.card,
    padded && styles.cardPadded,
    tone && { backgroundColor: toneColors[tone].bg, borderColor: 'transparent' },
    style,
  ];
  if (onPress) {
    return (
      <Tap onPress={onPress} style={base} accessibilityRole="button">
        {children}
      </Tap>
    );
  }
  return <View style={base}>{children}</View>;
};

/** Hairline-separated key/value line. */
export const Line = ({
  label,
  value,
  strong,
  tone,
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: Tone;
}) => (
  <View style={styles.line}>
    <Text style={[type.caption, textStart()]}>{label}</Text>
    <Text
      style={[
        strong ? type.bodyStrong : type.body,
        styles.lineValue,
        textEnd(),
        tone && { color: toneColors[tone].fg },
      ]}
      numberOfLines={2}
    >
      {value}
    </Text>
  </View>
);

export const Divider = ({ inset }: { inset?: boolean }) => (
  <View style={[styles.divider, inset && styles.dividerInset]} />
);

/** Section label with an optional end-edge action. */
export const SectionTitle = ({
  title,
  action,
  onAction,
  style,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}) => (
  <View style={[styles.section, style]}>
    <Text style={[type.heading, textStart(), styles.sectionTitle]} numberOfLines={1}>
      {title}
    </Text>
    {!!action && (
      <Pressable onPress={onAction} hitSlop={hitSlop}>
        <Text style={styles.sectionAction}>{action}</Text>
      </Pressable>
    )}
  </View>
);

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------

export const Segmented = <T extends string>({
  options,
  value,
  onChange,
  style,
}: {
  options: { value: T; label: string; icon?: IconName }[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
}) => (
  <View style={[styles.segmented, style]}>
    {options.map((option) => {
      const active = option.value === value;
      return (
        <Tap
          key={option.value}
          style={[styles.segment, active && styles.segmentActive]}
          onPress={() => onChange(option.value)}
          scale={0.96}
        >
          {!!option.icon && (
            <Ionicons name={option.icon} size={14} color={active ? colors.text : colors.textSubtle} />
          )}
          <Text style={[styles.segmentText, active && styles.segmentTextActive]} numberOfLines={1}>
            {option.label}
          </Text>
        </Tap>
      );
    })}
  </View>
);

/** Horizontal filter chip. */
export const Chip = ({
  label,
  active,
  onPress,
  icon,
  tone = 'info',
  count,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  icon?: IconName;
  tone?: Tone;
  count?: number;
}) => {
  const palette = toneColors[tone];
  return (
    <Tap
      onPress={onPress ?? (() => {})}
      disabled={!onPress}
      style={[styles.chip, active && { backgroundColor: colors.text, borderColor: colors.text }]}
      scale={0.95}
    >
      {!!icon && <Ionicons name={icon} size={13} color={active ? colors.white : palette.fg} />}
      <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
        {label}
      </Text>
      {count != null && (
        <View style={[styles.chipCount, active && { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
          <Text style={[styles.chipCountText, active && { color: colors.white }]}>{count}</Text>
        </View>
      )}
    </Tap>
  );
};

export const Field = ({
  label,
  icon,
  trailing,
  error,
  hint,
  style,
  ...props
}: TextInputProps & {
  label?: string;
  icon?: IconName;
  trailing?: ReactNode;
  error?: string | null;
  hint?: string;
  style?: StyleProp<ViewStyle>;
}) => (
  <View style={[styles.field, style]}>
    {!!label && <Text style={[type.label, textStart(), styles.fieldLabel]}>{label}</Text>}
    <View
      style={[
        styles.inputWrap,
        props.multiline && styles.inputWrapMultiline,
        !!error && styles.inputWrapError,
        props.editable === false && styles.inputWrapDisabled,
      ]}
    >
      {!!icon && (
        <Ionicons
          name={icon}
          size={18}
          color={error ? colors.danger : colors.textSubtle}
          style={[styles.inputIcon, props.multiline && styles.inputIconMultiline]}
        />
      )}
      <TextInput
        placeholderTextColor={colors.placeholder}
        selectionColor={colors.primary}
        {...props}
        style={[styles.input, textStart(), props.multiline && styles.inputMultiline]}
      />
      {trailing}
    </View>
    {!!error ? (
      <Text style={[type.caption, textStart(), styles.fieldError]}>{error}</Text>
    ) : !!hint ? (
      <Text style={[type.caption, textStart(), styles.fieldHint]}>{hint}</Text>
    ) : null}
  </View>
);

export const Button = ({
  label,
  onPress,
  loading,
  disabled,
  variant = 'primary',
  size = 'md',
  icon,
  iconEnd,
  style,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'white';
  size?: 'sm' | 'md' | 'lg';
  icon?: IconName;
  iconEnd?: IconName;
  style?: StyleProp<ViewStyle>;
}) => {
  const inactive = disabled || loading;
  const textColor =
    variant === 'primary'
      ? colors.white
      : variant === 'danger'
        ? colors.danger
        : variant === 'secondary'
          ? colors.primary
          : colors.text;

  return (
    <Tap
      style={[
        styles.button,
        size === 'sm' && styles.buttonSm,
        size === 'lg' && styles.buttonLg,
        variant === 'primary' && styles.buttonPrimary,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'ghost' && styles.buttonGhost,
        variant === 'danger' && styles.buttonDanger,
        variant === 'outline' && styles.buttonOutline,
        variant === 'white' && styles.buttonWhite,
        inactive && styles.buttonInactive,
        style,
      ]}
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <>
          {!!icon && <Ionicons name={icon} size={size === 'sm' ? 15 : 18} color={textColor} />}
          <Text style={[styles.buttonText, size === 'sm' && styles.buttonTextSm, { color: textColor }]}>
            {label}
          </Text>
          {!!iconEnd && <Ionicons name={iconEnd} size={size === 'sm' ? 15 : 18} color={textColor} />}
        </>
      )}
    </Tap>
  );
};

export const TextLink = ({ label, onPress, style }: { label: string; onPress: () => void; style?: StyleProp<ViewStyle> }) => (
  <Pressable style={[styles.textLink, style]} onPress={onPress} hitSlop={hitSlop}>
    <Text style={styles.textLinkLabel}>{label}</Text>
  </Pressable>
);

export const Badge = ({
  label,
  tone = 'neutral',
  icon,
  dot,
  size = 'md',
}: {
  label: string;
  tone?: Tone;
  icon?: IconName;
  dot?: boolean;
  size?: 'sm' | 'md';
}) => {
  const palette = toneColors[tone];
  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }, size === 'sm' && styles.badgeSm]}>
      {dot && <View style={[styles.badgeDot, { backgroundColor: palette.fg }]} />}
      {!!icon && <Ionicons name={icon} size={12} color={palette.fg} />}
      <Text style={[styles.badgeText, { color: palette.fg }, size === 'sm' && styles.badgeTextSm]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
};

const toneIcon: Record<Tone, IconName> = {
  neutral: 'information-circle',
  success: 'checkmark-circle',
  warning: 'alert-circle',
  danger: 'close-circle',
  info: 'information-circle',
  accent: 'water',
};

/** Full-width inline notice with an icon. */
export const Notice = ({
  text,
  tone = 'info',
  icon,
  title,
  action,
  onAction,
  style,
}: {
  text: string;
  tone?: Tone;
  icon?: IconName;
  title?: string;
  action?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}) => {
  const palette = toneColors[tone];
  return (
    <View style={[styles.notice, { backgroundColor: palette.bg }, style]}>
      <Ionicons name={icon ?? toneIcon[tone]} size={18} color={palette.fg} style={styles.noticeIcon} />
      <View style={styles.noticeBody}>
        {!!title && <Text style={[styles.noticeTitle, { color: palette.fg }, textStart()]}>{title}</Text>}
        <Text style={[styles.noticeText, { color: palette.fg }, textStart()]}>{text}</Text>
        {!!action && (
          <Pressable onPress={onAction} hitSlop={hitSlop}>
            <Text style={[styles.noticeAction, { color: palette.fg }, textStart()]}>{action}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};

export const Empty = ({
  text,
  title,
  icon = 'file-tray-outline',
  action,
  onAction,
}: {
  text: string;
  title?: string;
  icon?: IconName;
  action?: string;
  onAction?: () => void;
}) => (
  <View style={styles.empty}>
    <View style={styles.emptyIcon}>
      <Ionicons name={icon} size={26} color={colors.textSubtle} />
    </View>
    {!!title && <Text style={[type.subheading, styles.emptyTitle]}>{title}</Text>}
    <Text style={styles.emptyText}>{text}</Text>
    {!!action && (
      <Button label={action} onPress={onAction ?? (() => {})} variant="secondary" size="sm" style={styles.emptyAction} />
    )}
  </View>
);

export const Loading = ({ label }: { label?: string }) => (
  <View style={styles.empty}>
    <ActivityIndicator color={colors.primary} />
    {!!label && <Text style={[styles.emptyText, styles.loadingLabel]}>{label}</Text>}
  </View>
);

/** Rounded bottom sheet. One level of content, no nested surfaces. */
export const Sheet = ({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <Pressable style={styles.sheetBackdrop} onPress={onClose} />
    <View style={styles.sheet}>
      <View style={styles.sheetGrip} />
      <Text style={[type.heading, styles.sheetTitle]}>{title}</Text>
      {children}
    </View>
  </Modal>
);

/** Small ribbon marking a frontend-only feature running on mock data. */
export const MockBanner = ({ label, style }: { label: string; style?: StyleProp<ViewStyle> }) => (
  <View style={[styles.mock, style]}>
    <Ionicons name="flask-outline" size={12} color={colors.warning} />
    <Text style={styles.mockText} numberOfLines={1}>
      {label}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  body: { flex: 1, paddingHorizontal: spacing(5) },
  scrollBody: { paddingHorizontal: spacing(5), paddingBottom: spacing(10) },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing(2),
    paddingBottom: spacing(4),
    gap: spacing(3),
  },
  headerText: { flex: 1 },
  headerEyebrow: { marginBottom: 2, color: colors.primary },
  headerSubtitle: { marginTop: 2 },

  iconButton: {
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: radius.pill,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 2,
    borderColor: colors.background,
  },
  iconBadgeText: { color: colors.white, fontSize: 9, fontFamily: 'Inter_700Bold' },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  cardPadded: { padding: spacing(4) },

  line: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing(2.5),
    gap: spacing(4),
  },
  lineValue: { flexShrink: 1 },
  divider: { height: 1, backgroundColor: colors.border },
  dividerInset: { marginStart: spacing(12) },

  section: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing(6),
    marginBottom: spacing(3),
    gap: spacing(3),
  },
  sectionTitle: { flex: 1 },
  sectionAction: { fontSize: 12.5, fontFamily: 'Inter_600SemiBold', color: colors.primary },

  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    padding: 3,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  segmentActive: { backgroundColor: colors.white, ...shadow.soft },
  segmentText: { fontSize: 12.5, fontFamily: 'Inter_600SemiBold', color: colors.textSubtle },
  segmentTextActive: { color: colors.text },

  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing(3.5),
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: { fontSize: 12.5, fontFamily: 'Inter_600SemiBold', color: colors.textMuted },
  chipTextActive: { color: colors.white },
  chipCount: {
    minWidth: 18,
    height: 18,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  chipCountText: { fontSize: 10.5, fontFamily: 'Inter_700Bold', color: colors.textMuted },

  field: { marginBottom: spacing(3.5) },
  fieldLabel: { marginBottom: 6, marginStart: spacing(1) },
  fieldError: { marginTop: 5, marginStart: spacing(1), color: colors.danger },
  fieldHint: { marginTop: 5, marginStart: spacing(1) },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing(3.5),
    height: 50,
  },
  inputWrapMultiline: {
    height: undefined,
    minHeight: 104,
    paddingVertical: spacing(3),
    alignItems: 'flex-start',
  },
  inputWrapError: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
  inputWrapDisabled: { backgroundColor: colors.surfaceAlt },
  inputIcon: { marginEnd: spacing(2.5) },
  inputIconMultiline: { marginTop: 2 },
  input: { flex: 1, fontSize: 14.5, fontFamily: 'Inter_500Medium', color: colors.text, paddingVertical: 0 },
  inputMultiline: { textAlignVertical: 'top', lineHeight: 20 },

  button: {
    height: 50,
    flexDirection: 'row',
    gap: spacing(2),
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing(5),
  },
  buttonSm: { height: 38, paddingHorizontal: spacing(4), borderRadius: radius.sm },
  buttonLg: { height: 56, borderRadius: radius.lg },
  buttonPrimary: { backgroundColor: colors.primary, ...shadow.accent },
  buttonSecondary: { backgroundColor: colors.primarySoft },
  buttonGhost: { backgroundColor: colors.surfaceAlt },
  buttonDanger: { backgroundColor: colors.dangerSoft },
  buttonOutline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
  buttonWhite: { backgroundColor: colors.white, ...shadow.soft },
  buttonInactive: { opacity: 0.5 },
  buttonText: { fontSize: 14.5, fontFamily: 'Inter_700Bold' },
  buttonTextSm: { fontSize: 13 },

  textLink: { alignSelf: 'center', paddingVertical: spacing(3) },
  textLinkLabel: { fontSize: 12.5, color: colors.primary, fontFamily: 'Inter_600SemiBold' },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: radius.pill,
    paddingHorizontal: spacing(2.5),
    paddingVertical: 5,
  },
  badgeSm: { paddingHorizontal: spacing(2), paddingVertical: 3 },
  badgeDot: { width: 6, height: 6, borderRadius: radius.pill },
  badgeText: { fontSize: 11, fontFamily: 'Inter_700Bold' },
  badgeTextSm: { fontSize: 10 },

  notice: {
    flexDirection: 'row',
    gap: spacing(2.5),
    borderRadius: radius.md,
    paddingHorizontal: spacing(3.5),
    paddingVertical: spacing(3),
    marginVertical: spacing(1.5),
  },
  noticeIcon: { marginTop: 1 },
  noticeBody: { flex: 1, gap: 2 },
  noticeTitle: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  noticeText: { fontSize: 12.5, fontFamily: 'Inter_500Medium', lineHeight: 18 },
  noticeAction: { fontSize: 12.5, fontFamily: 'Inter_700Bold', marginTop: 4, textDecorationLine: 'underline' },

  empty: { paddingVertical: spacing(10), alignItems: 'center', gap: spacing(2) },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing(1),
  },
  emptyTitle: { textAlign: 'center' },
  emptyText: { fontSize: 13, color: colors.textSubtle, textAlign: 'center', lineHeight: 19, maxWidth: 260 },
  emptyAction: { marginTop: spacing(2) },
  loadingLabel: { marginTop: spacing(2) },

  sheetBackdrop: { flex: 1, backgroundColor: colors.overlay },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing(5),
    paddingTop: spacing(3),
    paddingBottom: spacing(10),
  },
  sheetGrip: {
    width: 36,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing(4),
  },
  sheetTitle: { marginBottom: spacing(3), textAlign: 'center' },

  mock: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingHorizontal: spacing(2.5),
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.warningSoft,
    marginBottom: spacing(3),
  },
  mockText: { fontSize: 10.5, fontFamily: 'Inter_700Bold', color: colors.warning, letterSpacing: 0.3 },
});
