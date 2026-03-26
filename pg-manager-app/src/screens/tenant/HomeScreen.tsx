import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadows } from '../../theme/colors';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import type { Invoice } from '../../types';

export function HomeScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    if (!user) return;
    setError(null);
    try {
      const res = await api.billing.listInvoices(user.id, 'tenant');
      setInvoices(res.data);
    } catch {
      // Tenant may not have invoices yet
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const pendingInvoices = invoices.filter(
    (inv) => inv.status !== 'paid' && inv.status !== 'waived',
  );
  const totalDue = pendingInvoices.reduce(
    (sum, inv) => sum + Number(inv.total),
    0,
  );

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.hero}>
        <View style={styles.heroHeaderRow}>
          <View>
            <Text style={styles.greeting}>
              {greeting}, {user?.name?.split(' ')[0] || 'there'}
            </Text>
            <Text style={styles.heroSubtitle}>
              {pendingInvoices.length > 0
                ? `You have ${pendingInvoices.length} pending invoice${pendingInvoices.length > 1 ? 's' : ''}`
                : "You're all caught up!"}
            </Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <Ionicons
              name="log-out-outline"
              size={22}
              color={colors.white}
            />
          </TouchableOpacity>
        </View>

        <View style={[styles.rentCard, shadows.lg]}>
          {totalDue > 0 ? (
            <>
              <View style={styles.rentHeaderRow}>
                <View>
                  <Text style={styles.rentReminderText}>Amount due</Text>
                  <Text style={styles.rentAmount}>
                    ₹{totalDue.toLocaleString()}
                  </Text>
                </View>
                {pendingInvoices[0] && (
                  <View style={styles.dueDateBadge}>
                    <Text style={styles.dueDateText}>
                      Due{' '}
                      {new Date(
                        pendingInvoices[0].dueDate,
                      ).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.rentActionsRow}>
                <TouchableOpacity
                  style={styles.rentSecondaryButton}
                  onPress={() => navigation.navigate('PayRent')}
                >
                  <Text style={styles.rentSecondaryText}>View Details</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.rentPrimaryButton}
                  onPress={() => navigation.navigate('PayRent')}
                >
                  <Text style={styles.rentPrimaryText}>Pay Rent</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.allPaidRow}>
              <Ionicons
                name="checkmark-circle"
                size={28}
                color={colors.secondary}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.allPaidTitle}>All dues cleared</Text>
                <Text style={styles.allPaidSubtitle}>
                  No pending payments at the moment
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {[
            {
              icon: 'chatbubble-ellipses-outline' as const,
              label: 'Complaints',
              color: colors.warning,
              onPress: () =>
                navigation.getParent()?.navigate('Complaints'),
            },
            {
              icon: 'notifications-outline' as const,
              label: 'Notifications',
              color: colors.primary,
              onPress: () =>
                navigation.getParent()?.navigate('Notifications'),
            },
            {
              icon: 'document-text-outline' as const,
              label: 'Documents',
              color: colors.secondary,
              onPress: () => navigation.navigate('Documents'),
            },
            {
              icon: 'card-outline' as const,
              label: 'Pay Rent',
              color: '#8B5CF6',
              onPress: () => navigation.navigate('PayRent'),
            },
          ].map((action) => (
            <TouchableOpacity
              key={action.label}
              style={styles.actionItem}
              onPress={action.onPress}
            >
              <View
                style={[
                  styles.actionIcon,
                  { backgroundColor: action.color + '15' },
                ]}
              >
                <Ionicons name={action.icon} size={22} color={action.color} />
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Invoices</Text>
        {invoices.length === 0 ? (
          <Card variant="elevated">
            <View style={styles.emptyInvoice}>
              <Ionicons
                name="receipt-outline"
                size={32}
                color={colors.textLight}
              />
              <Text style={styles.emptyText}>No invoices yet</Text>
              <Text style={styles.emptySubtext}>
                Your rent invoices will appear here
              </Text>
            </View>
          </Card>
        ) : (
          invoices.slice(0, 5).map((inv) => (
            <Card key={inv.id} style={styles.invoiceCard} variant="elevated">
              <View style={styles.invoiceRow}>
                <View>
                  <Text style={styles.invoiceNumber}>
                    {inv.invoiceNumber}
                  </Text>
                  <Text style={styles.invoicePeriod}>
                    {new Date(inv.periodStart).toLocaleDateString('en-IN', {
                      month: 'short',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.invoiceTotal}>
                    ₹{Number(inv.total).toLocaleString()}
                  </Text>
                  <Badge
                    label={inv.status}
                    color={inv.status === 'paid' ? '#D1FAE5' : '#FEF3C7'}
                    textColor={
                      inv.status === 'paid' ? '#065F46' : '#92400E'
                    }
                  />
                </View>
              </View>
            </Card>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 32 },
  hero: {
    paddingTop: 40,
    paddingHorizontal: 20,
    paddingBottom: 24,
    backgroundColor: colors.primary,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.white,
  },
  heroSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
  },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rentCard: {
    marginTop: 20,
    borderRadius: 24,
    backgroundColor: colors.white,
    padding: 16,
  },
  rentHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  rentReminderText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  rentAmount: {
    marginTop: 4,
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
  },
  dueDateBadge: {
    backgroundColor: colors.warning + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dueDateText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.warning,
  },
  allPaidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  allPaidTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  allPaidSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  rentActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  rentSecondaryButton: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rentSecondaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  rentPrimaryButton: {
    flex: 1,
    borderRadius: 999,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rentPrimaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  actionItem: { alignItems: 'center', width: 72 },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  actionLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptyInvoice: { alignItems: 'center', padding: 20 },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 8,
  },
  emptySubtext: { fontSize: 13, color: colors.textLight, marginTop: 2 },
  invoiceCard: { marginBottom: 10 },
  invoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invoiceNumber: { fontSize: 14, fontWeight: '600', color: colors.text },
  invoicePeriod: { fontSize: 12, color: colors.textLight, marginTop: 2 },
  invoiceTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
});
