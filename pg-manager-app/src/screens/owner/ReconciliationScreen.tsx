import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, shadows } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import type { ReconciliationReport } from '../../types';

function formatCurrency(n: number): string {
  return `₹${n.toLocaleString('en-IN')}`;
}

const METHOD_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  upi: { label: 'UPI', icon: 'qr-code-outline', color: '#7C3AED' },
  cash: { label: 'Cash', icon: 'cash-outline', color: '#059669' },
  bank_transfer: { label: 'Bank Transfer', icon: 'business-outline', color: '#2563EB' },
  card: { label: 'Card', icon: 'card-outline', color: '#D97706' },
  other: { label: 'Other', icon: 'ellipsis-horizontal', color: colors.textSecondary },
};

type Period = '7d' | '30d' | '90d' | 'custom';

function getDateRange(period: Period): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  switch (period) {
    case '7d': start.setDate(start.getDate() - 7); break;
    case '30d': start.setDate(start.getDate() - 30); break;
    case '90d': start.setDate(start.getDate() - 90); break;
    default: start.setDate(start.getDate() - 30); break;
  }
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

export function ReconciliationScreen() {
  const { user } = useAuth();
  const [report, setReport] = useState<ReconciliationReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<Period>('30d');

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const { start, end } = getDateRange(period);
      const res = await api.billing.getReconciliationReport(user.id, start, end);
      setReport(res.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [user, period]);

  useEffect(() => { setLoading(true); loadData(); }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!report) {
    return (
      <View style={styles.centered}>
        <Ionicons name="bar-chart-outline" size={48} color={colors.textLight} />
        <Text style={styles.emptyText}>No data available</Text>
      </View>
    );
  }

  const { summary, byMethod, daily } = report;
  const collectionRate = summary.totalExpected > 0
    ? Math.round((summary.totalCollected / summary.totalExpected) * 100)
    : 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {/* Period Selector */}
      <View style={styles.periodRow}>
        {(['7d', '30d', '90d'] as Period[]).map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.periodChip, period === p && styles.periodChipActive]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
              {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : '90 Days'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Summary Cards */}
      <Animated.View entering={FadeInDown.springify()} style={styles.summaryGrid}>
        <View style={[styles.summaryCard, { backgroundColor: colors.primary }]}>
          <Text style={styles.summaryLabel}>Expected</Text>
          <Text style={styles.summaryValue}>{formatCurrency(summary.totalExpected)}</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: colors.success }]}>
          <Text style={styles.summaryLabel}>Collected</Text>
          <Text style={styles.summaryValue}>{formatCurrency(summary.totalCollected)}</Text>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(80).springify()} style={styles.summaryGrid}>
        <View style={[styles.summaryCard, { backgroundColor: summary.totalShortfall > 0 ? colors.error : colors.success }]}>
          <Text style={styles.summaryLabel}>Shortfall</Text>
          <Text style={styles.summaryValue}>{formatCurrency(Math.max(0, summary.totalShortfall))}</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: colors.indigo900 }]}>
          <Text style={styles.summaryLabel}>Collection Rate</Text>
          <Text style={styles.summaryValue}>{collectionRate}%</Text>
        </View>
      </Animated.View>

      {/* By Payment Method */}
      <Animated.View entering={FadeInDown.delay(160).springify()}>
        <Text style={styles.sectionTitle}>By Payment Method</Text>
        <View style={styles.methodsCard}>
          {Object.entries(byMethod).length === 0 ? (
            <Text style={styles.noData}>No payments in this period</Text>
          ) : (
            Object.entries(byMethod).map(([method, amount]) => {
              const config = METHOD_LABELS[method] || METHOD_LABELS.other;
              const pct = summary.totalCollected > 0 ? Math.round((amount / summary.totalCollected) * 100) : 0;
              return (
                <View key={method} style={styles.methodRow}>
                  <View style={[styles.methodIcon, { backgroundColor: config.color + '15' }]}>
                    <Ionicons name={config.icon as any} size={20} color={config.color} />
                  </View>
                  <View style={styles.methodInfo}>
                    <Text style={styles.methodLabel}>{config.label}</Text>
                    <View style={styles.methodBar}>
                      <View style={[styles.methodBarFill, { width: `${pct}%`, backgroundColor: config.color }]} />
                    </View>
                  </View>
                  <View style={styles.methodRight}>
                    <Text style={styles.methodAmount}>{formatCurrency(amount)}</Text>
                    <Text style={styles.methodPct}>{pct}%</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </Animated.View>

      {/* Daily Breakdown */}
      <Animated.View entering={FadeInDown.delay(240).springify()}>
        <Text style={styles.sectionTitle}>Daily Breakdown</Text>
        {daily.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.noData}>No activity in this period</Text>
          </View>
        ) : (
          daily.slice(0, 15).map((row) => (
            <View key={row.date} style={[styles.dailyRow, shadows.sm]}>
              <View style={styles.dailyDate}>
                <Text style={styles.dailyDateText}>
                  {new Date(row.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                </Text>
              </View>
              <View style={styles.dailyInfo}>
                <View style={styles.dailyCol}>
                  <Text style={styles.dailyLabel}>Expected</Text>
                  <Text style={styles.dailyAmount}>{formatCurrency(row.expected)}</Text>
                </View>
                <View style={styles.dailyCol}>
                  <Text style={styles.dailyLabel}>Collected</Text>
                  <Text style={[styles.dailyAmount, { color: colors.success }]}>{formatCurrency(row.collected)}</Text>
                </View>
                <View style={styles.dailyCol}>
                  <Text style={styles.dailyLabel}>Gap</Text>
                  <Text style={[styles.dailyAmount, { color: row.shortfall > 0 ? colors.error : colors.success }]}>
                    {formatCurrency(Math.abs(row.shortfall))}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 32 },
  centered: {
    flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  emptyText: { fontSize: 14, color: colors.textSecondary },
  emptyCard: {
    backgroundColor: colors.surface, borderRadius: 12, padding: 24, alignItems: 'center',
  },
  noData: { fontSize: 14, color: colors.textLight },

  periodRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  periodChip: {
    flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
    backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border,
  },
  periodChipActive: {
    backgroundColor: colors.primary, borderColor: colors.primary,
  },
  periodText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  periodTextActive: { color: colors.white },

  summaryGrid: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  summaryCard: {
    flex: 1, borderRadius: 16, padding: 16,
  },
  summaryLabel: {
    fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.8)',
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  summaryValue: {
    fontSize: 20, fontWeight: '800', color: colors.white, marginTop: 6,
  },

  sectionTitle: {
    fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 20, marginBottom: 12,
  },

  methodsCard: {
    backgroundColor: colors.surface, borderRadius: 14, padding: 16, ...shadows.sm,
  },
  methodRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  methodIcon: {
    width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  methodInfo: { flex: 1, marginRight: 12 },
  methodLabel: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 6 },
  methodBar: {
    height: 6, backgroundColor: colors.surfaceContainerHighest, borderRadius: 3, overflow: 'hidden',
  },
  methodBarFill: { height: '100%', borderRadius: 3 },
  methodRight: { alignItems: 'flex-end' },
  methodAmount: { fontSize: 14, fontWeight: '700', color: colors.text },
  methodPct: { fontSize: 11, color: colors.textLight, marginTop: 2 },

  dailyRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: 12, padding: 14, marginBottom: 8,
  },
  dailyDate: {
    width: 52, height: 52, borderRadius: 12, backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  dailyDateText: { fontSize: 12, fontWeight: '700', color: colors.primary, textAlign: 'center' },
  dailyInfo: { flex: 1, flexDirection: 'row', justifyContent: 'space-between' },
  dailyCol: { alignItems: 'center' },
  dailyLabel: { fontSize: 10, fontWeight: '600', color: colors.textLight, marginBottom: 4 },
  dailyAmount: { fontSize: 13, fontWeight: '700', color: colors.text },
});
