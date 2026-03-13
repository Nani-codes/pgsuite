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

export function HomeScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    if (!user) return;
    try {
      const res = await api.billing.listInvoices(user.id);
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
            <Text style={styles.heroTitle}>100% Rent Collection</Text>
            <Text style={styles.heroTitleEmphasis}>in 5 days</Text>
            <Text style={styles.heroSubtitle}>
              Send bulk rent reminders & QR links
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
          <View style={styles.rentHeaderRow}>
            <View>
              <Text style={styles.rentReminderText}>
                Automatic reminder set for this month
              </Text>
              {invoices[0] && (
                <Text style={styles.rentTenant}>
                  {invoices[0].tenant?.name || 'Your PG'}
                </Text>
              )}
            </View>
            {invoices[0] && (
              <Text style={styles.rentAmount}>
                ₹{Number(invoices[0].total).toLocaleString()}
              </Text>
            )}
          </View>

          <View style={styles.rentActionsRow}>
            <TouchableOpacity 
              style={styles.rentSecondaryButton}
              onPress={() => navigation.navigate('PayRent')}
            >
              <Text style={styles.rentSecondaryText}>View Invoices</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.rentPrimaryButton}
              onPress={() => navigation.navigate('PayRent')}
            >
              <Text style={styles.rentPrimaryText}>Pay Rent</Text>
            </TouchableOpacity>
          </View>
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
              screen: 'Complaints',
            },
            {
              icon: 'notifications-outline' as const,
              label: 'Notifications',
              color: colors.primary,
              screen: 'Notifications',
            },
            {
              icon: 'document-text-outline' as const,
              label: 'Documents',
              color: colors.secondary,
              screen: 'Documents',
            },
            {
              icon: 'card-outline' as const,
              label: 'Pay Rent',
              color: '#8B5CF6',
              screen: 'PayRent',
            },
          ].map((action) => (
            <TouchableOpacity 
              key={action.label} 
              style={styles.actionItem}
              onPress={() => navigation.navigate(action.screen)}
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
          invoices.map((inv) => (
            <Card key={inv.id} style={styles.invoiceCard} variant="elevated">
              <View style={styles.invoiceRow}>
                <View>
                  <Text style={styles.invoiceNumber}>{inv.invoiceNumber}</Text>
                  <Text style={styles.invoicePeriod}>
                    {new Date(inv.periodStart).toLocaleDateString()} -{' '}
                    {new Date(inv.periodEnd).toLocaleDateString()}
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
  heroTitle: { fontSize: 20, fontWeight: '700', color: colors.white },
  heroTitleEmphasis: { fontSize: 22, fontWeight: '800', color: colors.white },
  heroSubtitle: {
    marginTop: 6,
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
  rentTenant: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  rentAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
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
  actionLabel: { fontSize: 12, color: colors.textSecondary, textAlign: 'center' },
  emptyInvoice: { alignItems: 'center', padding: 20 },
  emptyText: { fontSize: 15, fontWeight: '600', color: colors.textSecondary, marginTop: 8 },
  emptySubtext: { fontSize: 13, color: colors.textLight, marginTop: 2 },
  invoiceCard: { marginBottom: 10 },
  invoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invoiceNumber: { fontSize: 14, fontWeight: '600', color: colors.text },
  invoicePeriod: { fontSize: 12, color: colors.textLight, marginTop: 2 },
  invoiceTotal: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 4 },
});
