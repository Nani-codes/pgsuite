import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadows } from '../../theme/colors';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import type { Invoice } from '../../types';

// Conditionally import Razorpay (not available on web)
let RazorpayCheckout: any = null;
if (Platform.OS !== 'web') {
  try {
    RazorpayCheckout = require('react-native-razorpay').default;
  } catch {
    // Razorpay not available — will use fallback flow
  }
}

const PAYMENT_METHODS = [
  { key: 'online', label: 'Pay Online', icon: 'flash-outline' },
  { key: 'upi', label: 'UPI', icon: 'qr-code-outline' },
  { key: 'bank_transfer', label: 'Bank', icon: 'business-outline' },
  { key: 'cash', label: 'Cash', icon: 'cash-outline' },
] as const;

export function PayRentScreen({ navigation }: any) {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string>('online');
  const [paying, setPaying] = useState(false);

  const loadInvoices = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.billing.listInvoices(user.id, 'tenant');
      setInvoices(res.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const pendingInvoices = invoices.filter(
    (inv) => inv.status !== 'paid' && inv.status !== 'waived',
  );

  const totalDue = pendingInvoices.reduce((sum, inv) => {
    const paid = inv.payments?.reduce((s, p) => s + Number(p.amount), 0) ?? 0;
    return sum + (Number(inv.total) - paid);
  }, 0);

  const getOutstanding = (invoice: Invoice) => {
    const paid = invoice.payments?.reduce((s, p) => s + Number(p.amount), 0) ?? 0;
    return Number(invoice.total) - paid;
  };

  // ─── Razorpay Online Payment ────────────────────────────────────
  const handleRazorpayPayment = async () => {
    if (!selectedInvoice || !user) return;

    const amount = getOutstanding(selectedInvoice);
    if (amount <= 0) {
      Alert.alert('No Balance', 'This invoice is already fully paid.');
      return;
    }

    setPaying(true);
    try {
      // Step 1: Create Razorpay order on our server
      const orderRes = await api.billing.createOrder({
        invoiceId: selectedInvoice.id,
      });
      const orderData = orderRes.data;

      if (!RazorpayCheckout) {
        // Dev/web fallback: simulate successful payment
        Alert.alert(
          'Dev Mode',
          `Razorpay checkout is not available on this platform.\n\nOrder: ${orderData.orderId}\nAmount: ₹${orderData.amount.toLocaleString()}\n\nSimulating successful payment...`,
          [{
            text: 'Simulate Success',
            onPress: async () => {
              try {
                const verifyRes = await api.billing.verifyPayment({
                  invoiceId: selectedInvoice.id,
                  razorpay_order_id: orderData.orderId,
                  razorpay_payment_id: `pay_dev_${Date.now()}`,
                  razorpay_signature: 'dev_signature',
                });

                const receiptNo = verifyRes.data?.receipt?.receiptNumber;
                Alert.alert(
                  'Payment Successful',
                  `Payment of ₹${amount.toLocaleString()} recorded.${receiptNo ? `\nReceipt: ${receiptNo}` : ''}`,
                  [{
                    text: 'View Receipt',
                    onPress: () => {
                      if (verifyRes.data?.receipt?.id) {
                        navigation.navigate('Receipt', { receiptId: verifyRes.data.receipt.id });
                      }
                    },
                  }, { text: 'OK' }],
                );

                setSelectedInvoice(null);
                await loadInvoices();
              } catch (err: any) {
                Alert.alert('Payment Failed', err.message || 'Something went wrong.');
              }
            },
          }, { text: 'Cancel', style: 'cancel' }],
        );
        return;
      }

      // Step 2: Open Razorpay checkout
      const options = {
        key: orderData.keyId,
        amount: orderData.amountInPaise,
        currency: orderData.currency,
        name: 'PG Manager',
        description: `Invoice ${orderData.invoiceNumber}`,
        order_id: orderData.orderId,
        prefill: {
          name: user.name,
        },
        theme: {
          color: '#1a56db',
        },
      };

      const paymentData = await RazorpayCheckout.open(options);

      // Step 3: Verify payment with our server
      const verifyRes = await api.billing.verifyPayment({
        invoiceId: selectedInvoice.id,
        razorpay_order_id: paymentData.razorpay_order_id,
        razorpay_payment_id: paymentData.razorpay_payment_id,
        razorpay_signature: paymentData.razorpay_signature,
      });

      const receiptNo = verifyRes.data?.receipt?.receiptNumber;
      Alert.alert(
        'Payment Successful! 🎉',
        `Payment of ₹${amount.toLocaleString()} received.${receiptNo ? `\nReceipt: ${receiptNo}` : ''}`,
        [{
          text: 'View Receipt',
          onPress: () => {
            if (verifyRes.data?.receipt?.id) {
              navigation.navigate('Receipt', { receiptId: verifyRes.data.receipt.id });
            }
          },
        }, { text: 'OK' }],
      );

      setSelectedInvoice(null);
      await loadInvoices();
    } catch (err: any) {
      // Razorpay returns error code 0 if user dismisses
      if (err?.code === 0 || err?.description === 'Payment cancelled') {
        // User cancelled — no alert needed
      } else {
        Alert.alert('Payment Failed', err.message || err.description || 'Something went wrong.');
      }
    } finally {
      setPaying(false);
    }
  };

  // ─── Manual/Offline Payment (cash, UPI, bank) ──────────────────
  const handleManualPayment = async () => {
    if (!selectedInvoice || !user) return;

    const amount = getOutstanding(selectedInvoice);
    if (amount <= 0) {
      Alert.alert('No Balance', 'This invoice is already fully paid.');
      return;
    }

    Alert.alert(
      'Confirm Payment',
      `Record payment of ₹${amount.toLocaleString()} for ${selectedInvoice.invoiceNumber} via ${selectedMethod.replace('_', ' ')}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setPaying(true);
            try {
              const result = await api.billing.createTenantPayment(user.id, {
                invoiceId: selectedInvoice.id,
                amount,
                method: selectedMethod,
              });

              const receiptNo = result.data?.receipt?.receiptNumber;
              Alert.alert(
                'Payment Recorded',
                `Payment of ₹${amount.toLocaleString()} recorded.${receiptNo ? `\nReceipt: ${receiptNo}` : ''}`,
                [{ text: 'OK' }],
              );

              setSelectedInvoice(null);
              await loadInvoices();
            } catch (err: any) {
              Alert.alert('Payment Failed', err.message || 'Something went wrong.');
            } finally {
              setPaying(false);
            }
          },
        },
      ],
    );
  };

  const handlePay = () => {
    if (selectedMethod === 'online') {
      handleRazorpayPayment();
    } else {
      handleManualPayment();
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading invoices...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {pendingInvoices.length === 0 ? (
        <Card variant="elevated" style={styles.emptyCard}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={48} color={colors.vacant} />
          </View>
          <Text style={styles.emptyTitle}>All Caught Up!</Text>
          <Text style={styles.emptyText}>You have no pending rent payments</Text>
        </Card>
      ) : (
        <>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Due</Text>
            <Text style={styles.summaryAmount}>
              ₹{totalDue.toLocaleString()}
            </Text>
            <Text style={styles.summaryCount}>
              {pendingInvoices.length} pending invoice
              {pendingInvoices.length > 1 ? 's' : ''}
            </Text>
          </View>

          <Text style={styles.sectionTitle}>Pending Invoices</Text>

          {pendingInvoices.map((invoice) => {
            const outstanding = getOutstanding(invoice);
            const isSelected = selectedInvoice?.id === invoice.id;
            return (
              <TouchableOpacity
                key={invoice.id}
                onPress={() => setSelectedInvoice(isSelected ? null : invoice)}
                activeOpacity={0.7}
              >
                <Card
                  style={isSelected ? StyleSheet.flatten([styles.invoiceCard, styles.invoiceCardSelected]) as ViewStyle : styles.invoiceCard}
                  variant="elevated"
                >
                  <View style={styles.invoiceHeader}>
                    <View>
                      <Text style={styles.invoiceNumber}>
                        {invoice.invoiceNumber}
                      </Text>
                      <Text style={styles.invoicePeriod}>
                        {new Date(invoice.periodStart).toLocaleDateString('en-IN', {
                          month: 'long', year: 'numeric',
                        })}
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
                      <Text style={styles.amountValue}>
                        ₹{outstanding.toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.amountRow}>
                      <Text style={styles.amountLabel}>Due Date</Text>
                      <Text style={styles.amountValue}>
                        {new Date(invoice.dueDate).toLocaleDateString('en-IN')}
                      </Text>
                    </View>
                    {invoice.items?.some(i => i.type === 'late_fee') && (
                      <View style={styles.amountRow}>
                        <Text style={[styles.amountLabel, { color: colors.error }]}>
                          Includes Late Fee
                        </Text>
                        <Text style={[styles.amountValue, { color: colors.error }]}>
                          ₹{invoice.items.filter(i => i.type === 'late_fee').reduce((s, i) => s + Number(i.amount), 0).toLocaleString()}
                        </Text>
                      </View>
                    )}
                  </View>

                  {isSelected && (
                    <View style={styles.selectionIndicator}>
                      <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                      <Text style={styles.selectedText}>Selected for payment</Text>
                    </View>
                  )}
                </Card>
              </TouchableOpacity>
            );
          })}

          {selectedInvoice && (
            <>
              <Text style={styles.sectionTitle}>Payment Method</Text>
              <View style={styles.methodsRow}>
                {PAYMENT_METHODS.map((m) => (
                  <TouchableOpacity
                    key={m.key}
                    style={[
                      styles.methodItem,
                      selectedMethod === m.key && styles.methodItemActive,
                    ]}
                    onPress={() => setSelectedMethod(m.key)}
                  >
                    <Ionicons
                      name={m.icon as any}
                      size={24}
                      color={selectedMethod === m.key ? colors.white : colors.primary}
                    />
                    <Text
                      style={[
                        styles.methodLabel,
                        selectedMethod === m.key && styles.methodLabelActive,
                      ]}
                    >
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {selectedMethod === 'online' && (
                <View style={styles.onlineInfo}>
                  <Ionicons name="shield-checkmark-outline" size={16} color={colors.primary} />
                  <Text style={styles.onlineInfoText}>
                    Secure payment via Razorpay (UPI, Card, Net Banking)
                  </Text>
                </View>
              )}

              <Button
                title={paying ? 'Processing...' : `Pay ₹${getOutstanding(selectedInvoice).toLocaleString()}`}
                onPress={handlePay}
                loading={paying}
                disabled={paying}
                size="lg"
                style={{ marginTop: 24 }}
              />
            </>
          )}

          {!selectedInvoice && (
            <View style={styles.infoSection}>
              <Text style={styles.infoTitle}>Tap an invoice to select it for payment</Text>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 32 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: colors.textSecondary },
  emptyCard: { alignItems: 'center', padding: 40, marginTop: 20 },
  successIcon: { marginBottom: 16 },
  emptyTitle: {
    fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 8,
  },
  emptyText: {
    fontSize: 14, color: colors.textSecondary, textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    ...shadows.lg,
  },
  summaryLabel: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  summaryAmount: {
    fontSize: 36, fontWeight: '800', color: colors.white, marginVertical: 8,
  },
  summaryCount: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  sectionTitle: {
    fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 12,
  },
  invoiceCard: { marginBottom: 12 },
  invoiceCardSelected: { borderColor: colors.primary, borderWidth: 2 },
  invoiceHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
  },
  invoiceNumber: { fontSize: 16, fontWeight: '700', color: colors.text },
  invoicePeriod: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  invoiceBody: {
    marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.borderLight,
  },
  amountRow: {
    flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8,
  },
  amountLabel: { fontSize: 14, color: colors.textSecondary },
  amountValue: { fontSize: 14, fontWeight: '600', color: colors.text },
  selectionIndicator: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.borderLight,
  },
  selectedText: { fontSize: 13, fontWeight: '600', color: colors.primary },
  methodsRow: { flexDirection: 'row', justifyContent: 'space-around', gap: 8 },
  methodItem: {
    alignItems: 'center', gap: 6, flex: 1, paddingVertical: 16,
    borderRadius: 12, borderWidth: 2, borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  methodItemActive: {
    borderColor: colors.primary, backgroundColor: colors.primary,
  },
  methodLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  methodLabelActive: { color: colors.white },
  onlineInfo: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 12, padding: 12, borderRadius: 10,
    backgroundColor: colors.primary + '10',
  },
  onlineInfoText: { fontSize: 12, color: colors.primary, flex: 1 },
  infoSection: { marginTop: 24, alignItems: 'center' },
  infoTitle: {
    fontSize: 14, fontWeight: '600', color: colors.textLight, textAlign: 'center',
  },
});
