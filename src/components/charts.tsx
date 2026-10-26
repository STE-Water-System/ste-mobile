import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { colors, radius, spacing, textStart, toneColors, type, type Tone } from '../theme';

/**
 * Lightweight charts drawn with plain views, so no native charting dependency
 * is needed. Enough for consumption history and monthly progress.
 */

export type BarDatum = { label: string; value: number; tone?: Tone };

export const BarChart = ({
  data,
  height = 120,
  unit,
  highlightLast = true,
  emptyText,
}: {
  data: BarDatum[];
  height?: number;
  unit?: string;
  highlightLast?: boolean;
  emptyText?: string;
}) => {
  const max = Math.max(1, ...data.map((item) => item.value));
  if (data.length === 0) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={type.caption}>{emptyText ?? '—'}</Text>
      </View>
    );
  }

  return (
    <View>
      <View style={[styles.plot, { height }]}>
        {data.map((item, index) => {
          const last = index === data.length - 1;
          const ratio = item.value / max;
          const tone = item.tone ?? (last && highlightLast ? 'info' : 'neutral');
          const fill = tone === 'neutral' ? colors.border : toneColors[tone].fg;
          return (
            <View key={`${item.label}-${index}`} style={styles.column}>
              <Text style={[type.tiny, styles.value, last && { color: colors.text }]} numberOfLines={1}>
                {Math.round(item.value)}
              </Text>
              <View style={styles.barTrack}>
                <Animated.View
                  entering={FadeInUp.duration(500).delay(index * 40)}
                  style={[styles.bar, { height: `${Math.max(4, ratio * 100)}%`, backgroundColor: fill }]}
                />
              </View>
            </View>
          );
        })}
      </View>
      <View style={styles.labels}>
        {data.map((item, index) => (
          <Text key={`${item.label}-${index}`} style={[type.tiny, styles.label]} numberOfLines={1}>
            {item.label}
          </Text>
        ))}
      </View>
      {!!unit && <Text style={[type.tiny, textStart(), styles.unit]}>{unit}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  plot: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing(1.5) },
  column: { flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center', gap: 4 },
  value: { color: colors.textSubtle },
  barTrack: { flex: 1, width: '100%', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: radius.sm },
  labels: { flexDirection: 'row', gap: spacing(1.5), marginTop: spacing(2) },
  label: { flex: 1, textAlign: 'center' },
  unit: { marginTop: spacing(2) },
  empty: { alignItems: 'center', justifyContent: 'center' },
});
