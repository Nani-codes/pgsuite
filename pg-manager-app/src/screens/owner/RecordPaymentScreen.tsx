import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

const PAYMENT_METHODS = [
  { key: 'cash', label: 'Cash', icon: 'cash-outline' },
  { key: 'upi', label: 'UPI', icon: 'qr-code-outline' },
  { key: 'bank_transfer', label: 'Bank Transfer', icon: 'business-outline' },
  { key: 'card', label: 'Card', icon: 'card-outline' },
] as const;

export function RecordPaymentScreen({ navigation }: any) {
  const { user } = useAuth();
  const [tenants, setTenants] = useState<any[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<string>('cash');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      api.billing.getTenants(user.id).then((res) => setTenants(res.data));
    }
  }, [user]);

  useEffect(() => {
    if (selectedTenant && user) {
      api.billing.getTenantInvoices(selectedTenant.id, user.id).then((res) => {
        setInvoices(res.data);
        setSelectedInvoice(null);
      });
    }
  }, [selectedTenant]);

  useEffect(() => {
    if (selectedInvoice && !amount) {
      const due = Number(selectedInvoice.total) - 
        (selectedInvoice.payments?.reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0);
      setAmount(String(Math.round(due)));
    }
  }, [selectedInvoice]);

  const handleSubmit = async () => {
    if (!selectedInvoice || !amount || !method) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      await api.billing.createPayment(user!.id, {
        invoiceId: selectedInvoice.id,
        amount: Number(amount),
        method,
      });
      Alert.alert('Success', 'Payment recorded successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const pendingInvoices = invoices.filter((inv) => 
    inv.status !== 'paid' && inv.status !== 'waived'
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Select Tenant</Text>
      <View style={styles.optionsRow}>
        {tenants.map((tenant) => (
          <TouchableOpacity
            key={tenant.id}
            style={[
              styles.optionChip,
              selectedTenant?.id === tenant.id && styles.optionChipActive,
            ]}
            onPress={() => setSelectedTenant(tenant)}
          >
            <Ionicons
              name="person-outline"
              size={14}
              color={selectedTenant?.id === tenant.id ? colors.white : colors.textSecondary}
            />
            <Text
              style={[
                styles.optionText,
                selectedTenant?.id === tenant.id && styles.optionTextActive,
              ]}
            >
              {tenant.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {selectedTenant && pendingInvoices.length > 0 && (
        <>
          <Text style={styles.label}>Select Invoice</Text>
          {pendingInvoices.map((inv) => {
            const paid = inv.payments?.reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0;
            const due = Number(inv.total) - paid;
            const isSelected = selectedInvoice?.id === inv.id;
            return (
              <TouchableOpacity
                key={inv.id}
                onPress={() => setSelectedInvoice(inv)}
              >
                <Card 
                  style={isSelected ? styles.invoiceCardActive : styles.invoiceCard}
                >
                  <View style={styles.invoiceRow}>
                    <View>
                      <Text style={styles.invoiceNumber}>{inv.invoiceNumber}</Text>
                      <Text style={styles.invoicePeriod}>
                        {new Date(inv.periodStart).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.invoiceDue}>₹{Math.round(due).toLocaleString()} due</Text>
                      <Text style={styles.invoiceStatus}>{inv.status}</Text>
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })}
        </>
      )}

      {selectedTenant && pendingInvoices.length === 0 && (
        <Card variant="elevated" style={styles.emptyCard}>
          <Text style={styles.emptyText}>No pending invoices</Text>
          <Text style={styles.emptySubtext}>
            All invoices are paid for this tenant
          </Text>
        </Card>
      )}

      {selectedInvoice && (
        <>
          <Text style={styles.sectionTitle}>Payment Details</Text>
          
          <Text style={styles.label}>Amount (₹)</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter amount"
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholderTextColor={colors.textLight}
          />

          <Text style={styles.label}>Payment Method</Text>
          <View style={styles.methodsGrid}>
            {PAYMENT_METHODS.map((m) => (
              <TouchableOpacity
                key={m.key}
                style={[
                  styles.methodChip,
                  method === m.key && styles.methodChipActive,
                ]}
                onPress={() => setMethod(m.key)}
              >
                <Ionicons
                  name={m.icon as any}
                  size={20}
                  color={method === m.key ? colors.white : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.methodLabel,
                    method === m.key && styles.methodLabelActive,
                  ]}
                >
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Button
            title="Record Payment"
            onPress={handleSubmit}
            loading={loading}
            size="lg"
            style={{ marginTop: 24 }}
          />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 40 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
    marginTop: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
    marginTop: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  optionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  optionChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  optionText: { fontSize: 14, fontWeight: '500', color: colors.textSecondary },
  optionTextActive: { color: colors.white },
  invoiceCard: { marginBottom: 8 },
  invoiceCardActive: { borderColor: colors.primary, borderWidth: 2 },
  invoiceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  invoiceNumber: { fontSize: 15, fontWeight: '600', color: colors.text },
  invoicePeriod: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  invoiceDue: { fontSize: 14, fontWeight: '600', color: colors.warning },
  invoiceStatus: { fontSize: 12, color: colors.textSecondary, textTransform: 'capitalize', marginTop: 2 },
  emptyCard: { alignItems: 'center', padding: 24 },
  emptyText: { fontSize: 15, fontWeight: '600', color: colors.textSecondary },
  emptySubtext: { fontSize: 13, color: colors.textLight, marginTop: 4 },
  methodsGrid: { flexDirection: 'row', gap: 8 },
  methodChip: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  methodChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  methodLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  methodLabelActive: { color: colors.white },
});