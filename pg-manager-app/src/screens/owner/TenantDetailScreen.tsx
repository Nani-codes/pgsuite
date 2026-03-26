import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { colors, shadows } from '../../theme/colors';
import { Skeleton } from '../../components/Skeleton';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import type { Tenant, Invoice } from '../../types';

const DOC_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  id_proof: 'card-outline',
  address_proof: 'home-outline',
  passport: 'document-text-outline',
  aadhaar: 'finger-print-outline',
  pan: 'reader-outline',
  photo: 'image-outline',
};

function formatDocType(docType: string): string {
  return docType
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function TenantDetailScreen({ route, navigation }: any) {
  const { user } = useAuth();
  const { tenantId } = route.params;
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTenant = async () => {
    if (!user) return;
    try {
      const [tenantRes, invoiceRes] = await Promise.all([
        api.tenants.get(tenantId, user.id),
        api.billing.getTenantInvoices(tenantId, user.id),
      ]);
      setTenant(tenantRes.data);
      setInvoices(invoiceRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTenant();
  }, [tenantId, user]);

  const handleCheckout = () => {
    Alert.alert(
      'Checkout Tenant',
      `Are you sure you want to checkout ${tenant?.name}? This will end their lease and free the bed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Checkout',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.tenants.checkout(tenantId, user!.id);
              Toast.show({
                type: 'success',
                text1: 'Tenant Checked Out',
                text2: `${tenant?.name} has been checked out`,
              });
              navigation.goBack();
            } catch (err: any) {
              Toast.show({
                type: 'error',
                text1: 'Checkout Failed',
                text2: err.message,
              });
            }
          },
        },
      ],
    );
  };

  const activeLease = tenant?.leases?.find((l) => l.status === 'active');

  const totalPaid = useMemo(
    () =>
      invoices
        .filter((inv) => inv.status === 'paid')
        .reduce((sum, inv) => sum + Number(inv.total), 0),
    [invoices],
  );

  const nextDueInvoice = useMemo(
    () =>
      invoices
        .filter((inv) => inv.status === 'pending' || inv.status === 'overdue')
        .sort(
          (a, b) =>
            new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
        )[0] ?? null,
    [invoices],
  );

  const outstandingAmount = useMemo(
    () =>
      invoices
        .filter(
          (inv) =>
            inv.status === 'pending' ||
            inv.status === 'overdue' ||
            inv.status === 'partially_paid',
        )
        .reduce((sum, inv) => sum + Number(inv.total), 0),
    [invoices],
  );

  const sortedInvoices = useMemo(
    () =>
      [...invoices].sort(
        (a, b) =>
          new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime(),
      ),
    [invoices],
  );

  if (loading || !tenant) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroInner}>
            <Skeleton
              width={128}
              height={128}
              borderRadius={16}
              style={{ marginBottom: 4 }}
            />
            <View style={{ flex: 1, gap: 8 }}>
              <Skeleton width={200} height={28} />
              <Skeleton width={120} height={22} borderRadius={12} />
              <View style={styles.infoGrid}>
                <Skeleton width="100%" height={40} />
                <Skeleton width="100%" height={40} />
                <Skeleton width="100%" height={40} />
                <Skeleton width="100%" height={40} />
              </View>
            </View>
          </View>
        </View>
        <View style={styles.metricsRow}>
          <Skeleton style={{ flex: 1, height: 110, borderRadius: 16 }} />
          <Skeleton style={{ flex: 1, height: 110, borderRadius: 16 }} />
        </View>
        <Skeleton
          style={{ height: 200, marginTop: 24 }}
          borderRadius={16}
        />
      </ScrollView>
    );
  }

  const roomBed = activeLease
    ? `${(activeLease as any).bed?.room?.roomNumber ?? '—'} / ${(activeLease as any).bed?.label ?? '—'}`
    : '—';

  const checkInDate = activeLease
    ? new Date(activeLease.moveInDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '—';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Profile Card */}
      <Animated.View
        entering={FadeInDown.duration(400).delay(100)}
        style={styles.heroCard}
      >
        <View style={styles.heroDecoration} />
        <View style={styles.heroInner}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {tenant.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.heroInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.heroName}>{tenant.name}</Text>
              {outstandingAmount > 0 && (
                <View style={styles.outstandingBadge}>
                  <Ionicons
                    name="warning"
                    size={12}
                    color={colors.onErrorContainer}
                  />
                  <Text style={styles.outstandingText}>
                    OUTSTANDING: ₹{outstandingAmount.toLocaleString('en-IN')}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Room / Bed</Text>
                <Text style={styles.infoValue}>{roomBed}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Phone Number</Text>
                <Text style={styles.infoValue}>{tenant.phone}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Check-In Date</Text>
                <Text style={styles.infoValue}>{checkInDate}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Status</Text>
                <View style={styles.statusRow}>
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor:
                          tenant.status === 'active'
                            ? colors.success
                            : colors.textLight,
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.infoValue,
                      {
                        color:
                          tenant.status === 'active'
                            ? colors.success
                            : colors.textLight,
                      },
                    ]}
                  >
                    {tenant.status === 'active'
                      ? 'Active Resident'
                      : tenant.status.replace('_', ' ').replace(/\b\w/g, (c) =>
                          c.toUpperCase(),
                        )}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Quick Metrics */}
      <Animated.View
        entering={FadeInDown.duration(400).delay(200)}
        style={styles.metricsRow}
      >
        <View style={styles.metricCardGold}>
          <Text style={styles.metricLabelGold}>Total Paid</Text>
          <Text style={styles.metricValueGold}>
            ₹{totalPaid.toLocaleString('en-IN')}
          </Text>
          <Text style={styles.metricSubGold}>Since check-in</Text>
        </View>
        <View style={styles.metricCardDark}>
          <Text style={styles.metricLabelDark}>Next Due</Text>
          <Text style={styles.metricValueDark}>
            {nextDueInvoice
              ? new Date(nextDueInvoice.dueDate).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                })
              : '—'}
          </Text>
          <Text style={styles.metricSubDark}>
            {nextDueInvoice
              ? `₹${Number(nextDueInvoice.total).toLocaleString('en-IN')}`
              : 'No pending dues'}
          </Text>
        </View>
      </Animated.View>

      {/* Action Buttons */}
      {tenant.status === 'active' && (
        <Animated.View
          entering={FadeInDown.duration(400).delay(300)}
          style={styles.actionsRow}
        >
          <TouchableOpacity
            style={styles.primaryButton}
            activeOpacity={0.85}
            onPress={() =>
              navigation.navigate('EditTenant', { tenantId: tenant.id })
            }
          >
            <Ionicons name="create-outline" size={18} color={colors.white} />
            <Text style={styles.primaryButtonText}>Update Info</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.checkoutButton}
            activeOpacity={0.85}
            onPress={handleCheckout}
          >
            <Ionicons name="exit-outline" size={18} color={colors.error} />
            <Text style={styles.checkoutButtonText}>Checkout</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Payment History Timeline */}
      <Animated.View entering={FadeInUp.duration(400).delay(350)}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Payment History</Text>
        </View>
        {sortedInvoices.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons
              name="receipt-outline"
              size={32}
              color={colors.textLight}
            />
            <Text style={styles.emptyText}>No invoices yet</Text>
          </View>
        ) : (
          <View style={styles.timelineContainer}>
            {sortedInvoices.map((invoice, index) => {
              const isUnpaid =
                invoice.status === 'pending' ||
                invoice.status === 'overdue' ||
                invoice.status === 'partially_paid';
              const isLast = index === sortedInvoices.length - 1;

              return (
                <View key={invoice.id} style={styles.timelineItem}>
                  {!isLast && <View style={styles.timelineLine} />}
                  <View
                    style={[
                      styles.timelineDot,
                      {
                        backgroundColor: isUnpaid
                          ? colors.error
                          : colors.primaryContainer,
                      },
                    ]}
                  />
                  <View style={styles.timelineCard}>
                    <View style={styles.timelineCardLeft}>
                      <Text style={styles.timelineTitle}>
                        {invoice.invoiceNumber}
                      </Text>
                      <Text style={styles.timelineSub}>
                        {isUnpaid
                          ? `Due ${new Date(invoice.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
                          : `Paid • ${new Date(invoice.periodStart).toLocaleDateString('en-IN', { month: 'short' })} – ${new Date(invoice.periodEnd).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`}
                        {invoice.payments && invoice.payments.length > 0
                          ? ` • ${invoice.payments[0].method}`
                          : ''}
                      </Text>
                    </View>
                    <View style={styles.timelineCardRight}>
                      <Text
                        style={[
                          styles.timelineAmount,
                          { color: isUnpaid ? colors.error : colors.indigo900 },
                        ]}
                      >
                        ₹{Number(invoice.total).toLocaleString('en-IN')}
                      </Text>
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor: isUnpaid
                              ? colors.errorContainer
                              : colors.surfaceContainerHighest,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            {
                              color: isUnpaid
                                ? colors.onErrorContainer
                                : colors.textSecondary,
                            },
                          ]}
                        >
                          {isUnpaid ? 'UNPAID' : 'SUCCESS'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </Animated.View>

      {/* Documents Section */}
      {tenant.documents && tenant.documents.length > 0 && (
        <Animated.View entering={FadeInUp.duration(400).delay(450)}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Documentation</Text>
          </View>
          <View style={styles.docsCard}>
            {tenant.documents.map((doc) => (
              <View key={doc.id} style={styles.docRow}>
                <View style={styles.docIconWrap}>
                  <Ionicons
                    name={DOC_ICONS[doc.docType] ?? 'document-outline'}
                    size={20}
                    color={colors.primary}
                  />
                </View>
                <Text style={styles.docName}>{formatDocType(doc.docType)}</Text>
                {doc.verified && (
                  <View style={styles.verifiedBadge}>
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color={colors.success}
                    />
                    <Text style={styles.verifiedText}>Verified</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </Animated.View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 16,
  },

  // Hero Card
  heroCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    overflow: 'hidden',
    ...shadows.lg,
  },
  heroDecoration: {
    position: 'absolute',
    top: -32,
    right: -32,
    width: 128,
    height: 128,
    borderBottomLeftRadius: 64,
    backgroundColor: 'rgba(36, 56, 156, 0.05)',
  },
  heroInner: {
    flexDirection: 'row',
    gap: 16,
  },
  avatar: {
    width: 128,
    height: 128,
    borderRadius: 16,
    backgroundColor: colors.indigo900,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  avatarText: {
    fontSize: 48,
    fontWeight: '800',
    color: colors.white,
  },
  heroInfo: {
    flex: 1,
  },
  nameRow: {
    gap: 8,
    marginBottom: 12,
  },
  heroName: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.indigo900,
    letterSpacing: -0.3,
  },
  outstandingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: colors.errorContainer,
    borderRadius: 12,
  },
  outstandingText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.onErrorContainer,
    letterSpacing: 0.5,
  },

  // Info Grid
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
  },
  infoItem: {
    width: '48%',
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 3,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.indigo900,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },

  // Metrics
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  metricCardGold: {
    flex: 1,
    backgroundColor: colors.secondaryContainer,
    borderRadius: 16,
    padding: 18,
  },
  metricLabelGold: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.onSecondaryContainer,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  metricValueGold: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.onSecondaryContainer,
    marginTop: 6,
  },
  metricSubGold: {
    fontSize: 11,
    color: colors.onSecondaryContainer,
    opacity: 0.7,
    marginTop: 2,
  },
  metricCardDark: {
    flex: 1,
    backgroundColor: colors.indigo900,
    borderRadius: 16,
    padding: 18,
  },
  metricLabelDark: {
    fontSize: 10,
    fontWeight: '700',
    color: '#A5B4FC',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  metricValueDark: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.white,
    marginTop: 6,
  },
  metricSubDark: {
    fontSize: 11,
    color: '#A5B4FC',
    marginTop: 2,
  },

  // Actions
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: colors.primary,
    borderRadius: 14,
    ...shadows.md,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
  checkoutButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.errorContainer,
    backgroundColor: colors.white,
  },
  checkoutButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.error,
  },

  // Section
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.indigo900,
  },

  // Timeline
  timelineContainer: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 16,
    padding: 16,
  },
  timelineItem: {
    paddingLeft: 24,
    paddingBottom: 16,
    position: 'relative',
  },
  timelineLine: {
    position: 'absolute',
    left: 5,
    top: 12,
    bottom: 0,
    width: 2,
    backgroundColor: colors.borderLight,
  },
  timelineDot: {
    position: 'absolute',
    left: 0,
    top: 4,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.white,
  },
  timelineCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...shadows.sm,
  },
  timelineCardLeft: {
    flex: 1,
    marginRight: 12,
  },
  timelineTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.indigo900,
  },
  timelineSub: {
    fontSize: 11,
    color: colors.textLight,
    marginTop: 3,
  },
  timelineCardRight: {
    alignItems: 'flex-end',
  },
  timelineAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  statusBadge: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // Empty
  emptyCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textLight,
  },

  // Documents
  docsCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 12,
    ...shadows.sm,
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    marginBottom: 8,
  },
  docIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.indigo900,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.success,
  },
});
