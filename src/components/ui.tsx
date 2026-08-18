import React, { ReactNode } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, shadow, spacing, textEnd, textStart, type } from '../theme';

/**
 * Shared building blocks. Everything is a single flat surface — cards are never
 * nested inside other cards, which keeps the hierarchy readable.
 */

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export const Screen = ({
  children,
  scroll = false,
  style,
}: {
  children: ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
}) => (
  <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
    {scroll ? (
      <ScrollView
        contentContainerStyle={[styles.scrollBody, style]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        {children}
      </ScrollView>
    ) : (
      <View style={[styles.body, style]}>{children}</View>
    )}
  </SafeAreaView>
);

/** Title on the start edge, a single optional action on the end edge. */
export const Header = ({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) => (
  <View style={styles.header}>
    <View style={styles.headerText}>
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

export const Card = ({ children, style }: { children: ReactNode; style?: ViewStyle }) => (
  <View style={[styles.card, style]}>{children}</View>
);

/** Hairline-separated key/value line. Replaces the old nested mini-cards. */
export const Line = ({ label, value, strong }: { label: string; value: string; strong?: boolean }) => (
  <View style={styles.line}>
    <Text style={[type.caption, textStart()]}>{label}</Text>
    <Text style={[strong ? type.bodyStrong : type.body, styles.lineValue, textEnd()]} numberOfLines={1}>
      {value}
    </Text>
  </View>
);

export const Divider = () => <View style={styles.divider} />;

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------

export const Segmented = <T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) => (
  <View style={styles.segmented}>
    {options.map((option) => {
      const active = option.value === value;
      return (
        <TouchableOpacity
          key={option.value}
          style={[styles.segment, active && styles.segmentActive]}
          onPress={() => onChange(option.value)}
          activeOpacity={0.85}
        >
          <Text style={[styles.segmentText, active && styles.segmentTextActive]} numberOfLines={1}>
            {option.label}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

export const Field = ({
  label,
  trailing,
  ...props
}: TextInputProps & { label?: string; trailing?: ReactNode }) => (
  <View style={styles.field}>
    {!!label && <Text style={[type.label, textStart(), styles.fieldLabel]}>{label}</Text>}
    <View style={[styles.inputWrap, props.multiline && styles.inputWrapMultiline]}>
      <TextInput
        placeholderTextColor={colors.placeholder}
        {...props}
        style={[styles.input, textStart(), props.multiline && styles.inputMultiline]}
      />
      {trailing}
    </View>
  </View>
);

export const Button = ({
  label,
  onPress,
  loading,
  disabled,
  variant = 'primary',
  style,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'ghost' | 'danger';
  style?: ViewStyle;
}) => {
  const inactive = disabled || loading;
  return (
    <TouchableOpacity
      style={[
        styles.button,
        variant === 'primary' && styles.buttonPrimary,
        variant === 'ghost' && styles.buttonGhost,
        variant === 'danger' && styles.buttonDanger,
        inactive && styles.buttonInactive,
        style,
      ]}
      onPress={onPress}
      disabled={inactive}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'primary' ? colors.white : colors.primary} />
      ) : (
        <Text
          style={[
            styles.buttonText,
            variant === 'ghost' && styles.buttonTextGhost,
            variant === 'danger' && styles.buttonTextDanger,
          ]}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
};

export const TextLink = ({ label, onPress }: { label: string; onPress: () => void }) => (
  <TouchableOpacity style={styles.textLink} onPress={onPress} activeOpacity={0.7}>
    <Text style={styles.textLinkLabel}>{label}</Text>
  </TouchableOpacity>
);

export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

export const Badge = ({ label, tone = 'neutral' }: { label: string; tone?: Tone }) => (
  <View style={[styles.badge, toneStyles[tone].wrap]}>
    <Text style={[styles.badgeText, toneStyles[tone].text]} numberOfLines={1}>
      {label}
    </Text>
  </View>
);

/** Full-width inline notice. Used instead of stacking alert cards inside cards. */
export const Notice = ({ text, tone = 'info' }: { text: string; tone?: Tone }) => (
  <View style={[styles.notice, toneStyles[tone].wrap]}>
    <Text style={[styles.noticeText, toneStyles[tone].text, textStart()]}>{text}</Text>
  </View>
);

export const Empty = ({ text }: { text: string }) => (
  <View style={styles.empty}>
    <Text style={styles.emptyText}>{text}</Text>
  </View>
);

export const Loading = () => (
  <View style={styles.empty}>
    <ActivityIndicator color={colors.primary} />
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

const toneStyles: Record<Tone, { wrap: ViewStyle; text: { color: string } }> = {
  neutral: { wrap: { backgroundColor: colors.surfaceAlt }, text: { color: colors.textMuted } },
  success: { wrap: { backgroundColor: colors.successSoft }, text: { color: colors.success } },
  warning: { wrap: { backgroundColor: colors.warningSoft }, text: { color: colors.warning } },
  danger: { wrap: { backgroundColor: colors.dangerSoft }, text: { color: colors.danger } },
  info: { wrap: { backgroundColor: colors.primarySoft }, text: { color: colors.primary } },
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1, paddingHorizontal: spacing(5) },
  scrollBody: { paddingHorizontal: spacing(5), paddingBottom: spacing(8) },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing(2),
    paddingBottom: spacing(4),
    gap: spacing(3),
  },
  headerText: { flex: 1 },
  headerSubtitle: { marginTop: 2 },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(4),
  },

  line: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing(2.5),
    gap: spacing(4),
  },
  lineValue: { flexShrink: 1 },
  divider: { height: 1, backgroundColor: colors.border },

  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    padding: 3,
  },
  segment: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  segmentActive: { backgroundColor: colors.white, ...shadow.soft },
  segmentText: { fontSize: 13, fontWeight: '600', color: colors.textSubtle },
  segmentTextActive: { color: colors.text, fontWeight: '700' },

  field: { marginBottom: spacing(3) },
  fieldLabel: { marginBottom: 5, marginStart: spacing(2) },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing(4),
    height: 44,
  },
  inputWrapMultiline: {
    height: undefined,
    minHeight: 88,
    borderRadius: radius.md,
    paddingVertical: spacing(3),
    alignItems: 'flex-start',
  },
  input: { flex: 1, fontSize: 13.5, fontWeight: '500', color: colors.text, paddingVertical: 0 },
  inputMultiline: { textAlignVertical: 'top' },

  button: {
    height: 46,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing(5),
  },
  buttonPrimary: { backgroundColor: colors.primary, ...shadow.accent },
  buttonGhost: { backgroundColor: colors.surfaceAlt },
  buttonDanger: { backgroundColor: colors.dangerSoft },
  buttonInactive: { opacity: 0.5 },
  buttonText: { color: colors.white, fontSize: 13.5, fontWeight: '700' },
  buttonTextGhost: { color: colors.text },
  buttonTextDanger: { color: colors.danger },

  textLink: { alignSelf: 'center', paddingVertical: spacing(3) },
  textLinkLabel: { fontSize: 12, color: colors.textSubtle, fontWeight: '500', textDecorationLine: 'underline' },

  badge: { borderRadius: radius.pill, paddingHorizontal: spacing(2.5), paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: '700' },

  notice: { borderRadius: radius.md, paddingHorizontal: spacing(4), paddingVertical: spacing(3) },
  noticeText: { fontSize: 12.5, fontWeight: '600', lineHeight: 18 },

  empty: { paddingVertical: spacing(12), alignItems: 'center' },
  emptyText: { fontSize: 13, color: colors.textSubtle, textAlign: 'center' },

  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.35)' },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
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
});
