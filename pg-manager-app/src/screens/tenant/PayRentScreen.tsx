import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadows } from '../../theme/colors';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

export function PayRentScreen({ navigation }: any) {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      api.billing.listInvoices(user.id).then((res) => {
        setInvoices(res.data);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [user]);

  const pendingInvoices = invoices.filter((inv) => 
    inv.status !== 'paid' && inv.status !== 'waived'
  );

  const handlePayNow = (invoice: any) => {
    Alert.alert(
      'Pay Rent',
      `Would you like to pay ₹${Number(invoice.total).toLocaleString()} for ${invoice.invoiceNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Pay with UPI', 
          onPress: () => {
            Alert.alert('Payment Link', 'In production, this would open UPI app with payment link');
          }
        },
        { 
          text: 'Pay with Card', 
          onPress: () => {
            Alert.alert('Payment Gateway', 'In production, this would redirect to payment gateway');
          }
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {pendingInvoices.length === 0 ? (
        <Card variant="elevated" style={styles.emptyCard}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={48} color={colors.vacant} />
          </View>
          <Text style={styles.emptyTitle}>All Caught Up!</Text>
          <Text style={styles.emptyText}>
            You have no pending rent payments
          </Text>
        </Card>
      ) : (
        <>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Due</Text>
            <Text style={styles.summaryAmount}>
              ₹{pendingInvoices.reduce((sum, inv) => sum + Number(inv.total), 0).toLocaleString()}
            </Text>
            <Text style={styles.summaryCount}>
              {pendingInvoices.length} pending invoice{pendingInvoices.length > 1 ? 's' : ''}
            </Text>
          </View>

          <Text style={styles.sectionTitle}>Pending Invoices</Text>
          
          {pendingInvoices.map((invoice) => {
            const due = Number(invoice.total);
            return (
              <Card key={invoice.id} style={styles.invoiceCard} variant="elevated">
                <View style={styles.invoiceHeader}>
                  <View>
                    <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
                    <Text style={styles.invoicePeriod}>
                      {new Date(invoice.periodStart).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                    </Text>
                  </View>
                  <Badge 
                    label={invoice.status.replace('_', ' ')} 
                    color={invoice.status === 'overdue' ? '#FEE2E2' : '#FEF3C7'}
                    textColor={invoice.status === 'overdue' ? '#991B1B' : '#92400E'}
                  />
                </View>

                <View style={styles.invoiceBody}>
                  <View style={styles.amountRow}>
                    <Text style={styles.amountLabel}>Amount Due</Text>
                    <Text style={styles.amountValue}>₹{due.toLocaleString()}</Text>
                  </View>
                  <View style={styles.amountRow}>
                    <Text style={styles.amountLabel}>Due Date</Text>
                    <Text style={styles.amountValue}>
                      {new Date(invoice.dueDate).toLocaleDateString('en-IN')}
                    </Text>
                  </View>
                </View>

                <View style={styles.invoiceActions}>
                  <Button
                    title="Pay Now"
                    onPress={() => handlePayNow(invoice)}
                    size="md"
                    style={{ flex: 1 }}
                  />
                </View>
              </Card>
            );
          })}

          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>Payment Methods</Text>
            <View style={styles.methodsRow}>
              <View style={styles.methodItem}>
                <Ionicons name="qr-code-outline" size={24} color={colors.primary} />
                <Text style={styles.methodLabel}>UPI</Text>
              </View>
              <View style={styles.methodItem}>
                <Ionicons name="card-outline" size={24} color={colors.primary} />
                <Text style={styles.methodLabel}>Card</Text>
              </View>
              <View style={styles.methodItem}>
                <Ionicons name="business-outline" size={24} color={colors.primary} />
                <Text style={styles.methodLabel}>Bank</Text>
              </View>
              <View style={styles.methodItem}>
                <Ionicons name="cash-outline" size={24} color={colors.primary} />
                <Text style={styles.methodLabel}>Cash</Text>
              </View>
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 32 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: colors.textSecondary },
  emptyCard: { alignItems: 'center', padding: 40, marginTop: 20 },
  successIcon: { marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 8 },
  emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  summaryCard: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    ...shadows.lg,
  },
  summaryLabel: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  summaryAmount: { fontSize: 36, fontWeight: '800', color: colors.white, marginVertical: 8 },
  summaryCount: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 12 },
  invoiceCard: { marginBottom: 12 },
  invoiceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  invoiceNumber: { fontSize: 16, fontWeight: '700', color: colors.text },
  invoicePeriod: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  invoiceBody: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.borderLight },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  amountLabel: { fontSize: 14, color: colors.textSecondary },
  amountValue: { fontSize: 14, fontWeight: '600', color: colors.text },
  invoiceActions: { marginTop: 16 },
  infoSection: { marginTop: 24 },
  infoTitle: { fontSize: 14, fontWeight: '600', color: colors.textSecondary, marginBottom: 12 },
  methodsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  methodItem: { alignItems: 'center', gap: 6 },
  methodLabel: { fontSize: 12, color: colors.textSecondary },
});