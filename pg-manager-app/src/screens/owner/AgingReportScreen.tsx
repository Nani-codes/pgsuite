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
import type { AgingBucket } from '../../types';

const BUCKET_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  'Current (not yet due)': { bg: colors.successLight, text: colors.success, icon: 'time-outline' },
  '1-30 days': { bg: '#FEF3C7', text: '#92400E', icon: 'alert-circle-outline' },
  '31-60 days': { bg: '#FED7AA', text: '#9A3412', icon: 'warning-outline' },
  '61-90 days': { bg: '#FECACA', text: '#991B1B', icon: 'flame-outline' },
  '90+ days': { bg: '#FEE2E2', text: '#7F1D1D', icon: 'skull-outline' },
};

function formatCurrency(n: number): string {
  return `₹${n.toLocaleString('en-IN')}`;
}

export function AgingReportScreen() {
  const { user } = useAuth();
  const [buckets, setBuckets] = useState<AgingBucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedBucket, setExpandedBucket] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.billing.getAgingReport(user.id);
      setBuckets(res.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const totalOutstanding = buckets.reduce((sum, b) => sum + b.totalAmount, 0);
  const totalOverdue = buckets
    .filter((b) => b.bucket !== 'Current (not yet due)')
    .reduce((sum, b) => sum + b.totalAmount, 0);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      <Animated.View entering={FadeInDown.springify()} style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: colors.primary }]}>
          <Text style={styles.summaryLabel}>Total Outstanding</Text>
          <Text style={styles.summaryValue}>{formatCurrency(totalOutstanding)}</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: colors.error }]}>
          <Text style={styles.summaryLabel}>Total Overdue</Text>
          <Text style={styles.summaryValue}>{formatCurrency(totalOverdue)}</Text>
        </View>
      </Animated.View>

      {buckets.map((bucket, index) => {
        const colorConfig = BUCKET_COLORS[bucket.bucket] || BUCKET_COLORS['1-30 days'];
        const isExpanded = expandedBucket === bucket.bucket;

        return (
          <Animated.View
            key={bucket.bucket}
            entering={FadeInDown.delay(index * 80).springify()}
          >
            <TouchableOpacity
              style={[styles.bucketCard, shadows.sm]}
              onPress={() => setExpandedBucket(isExpanded ? null : bucket.bucket)}
              activeOpacity={0.7}
            >
              <View style={[styles.bucketIcon, { backgroundColor: colorConfig.bg }]}>
                <Ionicons name={colorConfig.icon as any} size={22} color={colorConfig.text} />
              </View>
              <View style={styles.bucketInfo}>
                <Text style={styles.bucketName}>{bucket.bucket}</Text>
                <Text style={styles.bucketCount}>{bucket.count} invoice{bucket.count !== 1 ? 's' : ''}</Text>
              </View>
              <View style={styles.bucketRight}>
                <Text style={[styles.bucketAmount, { color: colorConfig.text }]}>
                  {formatCurrency(bucket.totalAmount)}
                </Text>
                <Ionicons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={colors.textLight}
                />
              </View>
            </TouchableOpacity>

            {isExpanded && bucket.invoices.length > 0 && (
              <View style={styles.invoicesList}>
                {bucket.invoices.map((inv) => (
                  <View key={inv.id} style={styles.invoiceRow}>
                    <View style={styles.invoiceLeft}>
                      <Text style={styles.invoiceTenant}>{inv.tenantName}</Text>
                      <Text style={styles.invoiceNum}>{inv.invoiceNumber}</Text>
                    </View>
                    <View style={styles.invoiceRight}>
                      <Text style={styles.invoiceAmount}>{formatCurrency(inv.total)}</Text>
                      {inv.daysOverdue > 0 && (
                        <Text style={styles.invoiceDays}>{inv.daysOverdue}d overdue</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </Animated.View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 32 },
  centered: {
    flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center',
  },

  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  summaryCard: {
    flex: 1, borderRadius: 16, padding: 18,
  },
  summaryLabel: {
    fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  summaryValue: {
    fontSize: 22, fontWeight: '800', color: colors.white, marginTop: 8,
  },

  bucketCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: 14, padding: 16,
    marginBottom: 10,
  },
  bucketIcon: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  bucketInfo: { flex: 1 },
  bucketName: { fontSize: 15, fontWeight: '700', color: colors.text },
  bucketCount: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  bucketRight: { alignItems: 'flex-end', gap: 4 },
  bucketAmount: { fontSize: 16, fontWeight: '700' },

  invoicesList: {
    backgroundColor: colors.surfaceAlt, borderRadius: 12, padding: 12,
    marginBottom: 10, marginTop: -6,
  },
  invoiceRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  invoiceLeft: { flex: 1 },
  invoiceTenant: { fontSize: 14, fontWeight: '600', color: colors.text },
  invoiceNum: { fontSize: 12, color: colors.textLight, marginTop: 2 },
  invoiceRight: { alignItems: 'flex-end' },
  invoiceAmount: { fontSize: 14, fontWeight: '700', color: colors.text },
  invoiceDays: { fontSize: 11, color: colors.error, marginTop: 2 },
});
