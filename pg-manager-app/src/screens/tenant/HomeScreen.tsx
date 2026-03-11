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

export function HomeScreen() {
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
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello,</Text>
          <Text style={styles.name}>{user?.name || 'Tenant'}</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={[styles.rentCard, shadows.md]}>
        <View style={styles.rentCardTop}>
          <Ionicons name="wallet-outline" size={24} color={colors.white} />
          <Text style={styles.rentCardTitle}>Your Rent</Text>
        </View>
        <Text style={styles.rentCardNote}>
          {invoices.length > 0
            ? 'Your latest invoice details'
            : 'No invoices generated yet'}
        </Text>
        {invoices.length > 0 && (
          <View style={styles.invoicePreview}>
            <Text style={styles.invoiceAmount}>
              ₹{Number(invoices[0].total).toLocaleString()}
            </Text>
            <Badge
              label={invoices[0].status}
              color="rgba(255,255,255,0.2)"
              textColor={colors.white}
            />
          </View>
        )}
      </View>

      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsGrid}>
        {[
          { icon: 'chatbubble-ellipses-outline' as const, label: 'Complaints', color: colors.warning },
          { icon: 'notifications-outline' as const, label: 'Notifications', color: colors.primary },
          { icon: 'document-text-outline' as const, label: 'Documents', color: colors.secondary },
          { icon: 'person-outline' as const, label: 'Profile', color: '#8B5CF6' },
        ].map((action) => (
          <TouchableOpacity key={action.label} style={styles.actionItem}>
            <View style={[styles.actionIcon, { backgroundColor: action.color + '15' }]}>
              <Ionicons name={action.icon} size={22} color={action.color} />
            </View>
            <Text style={styles.actionLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Recent Invoices</Text>
      {invoices.length === 0 ? (
        <Card>
          <View style={styles.emptyInvoice}>
            <Ionicons name="receipt-outline" size={32} color={colors.textLight} />
            <Text style={styles.emptyText}>No invoices yet</Text>
            <Text style={styles.emptySubtext}>
              Your rent invoices will appear here
            </Text>
          </View>
        </Card>
      ) : (
        invoices.map((inv) => (
          <Card key={inv.id} style={styles.invoiceCard}>
            <View style={styles.invoiceRow}>
              <View>
                <Text style={styles.invoiceNumber}>{inv.invoiceNumber}</Text>
                <Text style={styles.invoicePeriod}>
                  {new Date(inv.periodStart).toLocaleDateString()} - {new Date(inv.periodEnd).toLocaleDateString()}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.invoiceTotal}>
                  ₹{Number(inv.total).toLocaleString()}
                </Text>
                <Badge
                  label={inv.status}
                  color={inv.status === 'paid' ? '#D1FAE5' : '#FEF3C7'}
                  textColor={inv.status === 'paid' ? '#065F46' : '#92400E'}
                />
              </View>
            </View>
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 32 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: { fontSize: 14, color: colors.textSecondary },
  name: { fontSize: 22, fontWeight: '700', color: colors.text },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rentCard: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
  },
  rentCardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  rentCardTitle: { fontSize: 16, fontWeight: '600', color: colors.white },
  rentCardNote: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 12 },
  invoicePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  invoiceAmount: { fontSize: 32, fontWeight: '800', color: colors.white },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 12 },
  actionsGrid: { flexDirection: 'row', gap: 12, marginBottom: 24, flexWrap: 'wrap' },
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
