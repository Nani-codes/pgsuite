import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, shadows } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import type { Invoice } from '../../types';

interface Stats {
  collected: number;
  pending: number;
  overdueCount: number;
}

function computeStats(invoices: Invoice[]): Stats {
  let collected = 0;
  let pending = 0;
  let overdueCount = 0;

  for (const inv of invoices) {
    const paid = inv.payments?.reduce((s, p) => s + p.amount, 0) ?? 0;

    if (inv.status === 'paid' || inv.status === 'waived') {
      collected += paid || inv.total;
    } else {
      const remaining = inv.total - paid;
      pending += remaining > 0 ? remaining : 0;
      if (inv.status === 'overdue') overdueCount++;
    }
  }

  return { collected, pending, overdueCount };
}

function formatCurrency(n: number): string {
  return `₹${n.toLocaleString('en-IN')}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { month: 'short', day: '2-digit' });
}

function statusLabel(invoice: Invoice): string {
  switch (invoice.status) {
    case 'paid':
    case 'waived':
      return 'COMPLETED';
    case 'partially_paid':
      return 'BALANCE DUE';
    case 'overdue':
      return 'OVERDUE';
    default:
      return 'PENDING DUE';
  }
}

function isPaid(invoice: Invoice): boolean {
  return invoice.status === 'paid' || invoice.status === 'waived';
}

function displayAmount(invoice: Invoice): number {
  if (isPaid(invoice)) {
    const paid = invoice.payments?.reduce((s, p) => s + p.amount, 0) ?? 0;
    return paid || invoice.total;
  }
  const paid = invoice.payments?.reduce((s, p) => s + p.amount, 0) ?? 0;
  return invoice.total - paid;
}

function subtitle(invoice: Invoice): string {
  const inv = `Inv #${invoice.invoiceNumber}`;
  if (isPaid(invoice)) {
    const method = invoice.payments?.[0]?.method ?? 'N/A';
    return `${inv} • ${method} • ${formatDate(invoice.periodEnd)}`;
  }
  return `${inv} • Due since ${formatShortDate(invoice.dueDate)}`;
}

function PaymentItem({ invoice, index }: { invoice: Invoice; index: number }) {
  const paid = isPaid(invoice);
  const amount = displayAmount(invoice);
  const label = statusLabel(invoice);
  const accentColor = paid ? colors.success : colors.error;
  const bgColor = paid ? colors.successLight : colors.errorContainer;

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
      <View style={styles.paymentRow}>
        <View style={[styles.statusIcon, { backgroundColor: bgColor }]}>
          <Ionicons
            name={paid ? 'checkmark-circle' : 'time-outline'}
            size={24}
            color={accentColor}
          />
        </View>

        <View style={styles.paymentInfo}>
          <Text style={styles.tenantName} numberOfLines={1}>
            {invoice.tenant?.name ?? 'Unknown Tenant'}
          </Text>
          <Text style={styles.paymentSubtitle} numberOfLines={1}>
            {subtitle(invoice)}
          </Text>
        </View>

        <View style={styles.paymentRight}>
          <Text style={[styles.paymentAmount, { color: accentColor }]}>
            {formatCurrency(amount)}
          </Text>
          <Text style={[styles.paymentLabel, { color: accentColor }]}>
            {label}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

export function PaymentTrackerScreen({ navigation }: any) {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const fetchInvoices = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.billing.listInvoices(user.id, 'owner');
      setInvoices(res.data);
    } catch {
      // silent — pull-to-refresh to retry
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchInvoices();
    setRefreshing(false);
  }, [fetchInvoices]);

  const filtered = useMemo(() => {
    if (!search.trim()) return invoices;
    const q = search.toLowerCase();
    return invoices.filter(
      (inv) =>
        inv.tenant?.name?.toLowerCase().includes(q) ||
        inv.invoiceNumber.toLowerCase().includes(q),
    );
  }, [invoices, search]);

  const stats = useMemo(() => computeStats(invoices), [invoices]);

  const renderItem = useCallback(
    ({ item, index }: { item: Invoice; index: number }) => (
      <PaymentItem invoice={item} index={index} />
    ),
    [],
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <>
            {/* Header */}
            <Animated.View entering={FadeInDown.springify()} style={styles.header}>
              <Text style={styles.headerLabel}>Financial Overview</Text>
              <Text style={styles.headerTitle}>Payment Tracker</Text>
            </Animated.View>

            {/* Stats Grid */}
            <Animated.View entering={FadeInDown.delay(80).springify()} style={styles.statsGrid}>
              <View style={[styles.statCard, shadows.md]}>
                <Text style={styles.statLabel}>Collection this month</Text>
                <Text style={[styles.statValue, { color: colors.primary }]}>
                  {formatCurrency(stats.collected)}
                </Text>
              </View>

              <View style={[styles.statCard, shadows.md]}>
                <Text style={styles.statLabel}>Pending Dues</Text>
                <Text style={[styles.statValue, { color: colors.error }]}>
                  {formatCurrency(stats.pending)}
                </Text>
              </View>

              <View style={[styles.statCard, styles.statCardAmber]}>
                <Text style={styles.statLabelAmber}>Overdue Notices</Text>
                <Text style={styles.statValueAmber}>
                  {String(stats.overdueCount).padStart(2, '0')} Tenants
                </Text>
              </View>
            </Animated.View>

            {/* Search */}
            <Animated.View entering={FadeInDown.delay(160).springify()} style={styles.searchWrap}>
              <Ionicons
                name="search-outline"
                size={20}
                color={colors.textLight}
                style={styles.searchIcon}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by tenant name or invoice #..."
                placeholderTextColor={colors.textLight}
                value={search}
                onChangeText={setSearch}
                returnKeyType="search"
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')} style={styles.clearBtn}>
                  <Ionicons name="close-circle" size={18} color={colors.textLight} />
                </TouchableOpacity>
              )}
            </Animated.View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={48} color={colors.textLight} />
            <Text style={styles.emptyTitle}>No invoices found</Text>
            <Text style={styles.emptySubtitle}>
              {search ? 'Try a different search term' : 'Invoices will appear here once created'}
            </Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('RecordPayment')}
      >
        <Ionicons name="add" size={28} color={colors.onSecondaryContainer} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },

  header: {
    marginTop: 12,
    marginBottom: 20,
  },
  headerLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: colors.secondary,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -0.5,
  },

  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    justifyContent: 'space-between',
    minHeight: 100,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 12,
  },
  statCardAmber: {
    backgroundColor: colors.secondaryContainer,
  },
  statLabelAmber: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.onSecondaryContainer,
  },
  statValueAmber: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.onSecondaryContainer,
    marginTop: 12,
  },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: 16,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  clearBtn: {
    padding: 4,
  },

  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    ...shadows.sm,
  },
  statusIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  paymentInfo: {
    flex: 1,
    marginRight: 12,
  },
  tenantName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  paymentSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 3,
  },
  paymentRight: {
    alignItems: 'flex-end',
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  paymentLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 3,
  },

  empty: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textLight,
    textAlign: 'center',
  },

  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
});
