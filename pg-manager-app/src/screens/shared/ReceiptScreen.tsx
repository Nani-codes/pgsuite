import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Share,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, shadows } from '../../theme/colors';
import { Button } from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import type { Receipt } from '../../types';

// Conditionally import file system and sharing (not available on web)
let FileSystem: any = null;
let Sharing: any = null;
if (Platform.OS !== 'web') {
  try {
    FileSystem = require('expo-file-system');
    Sharing = require('expo-sharing');
  } catch {
    // Not available
  }
}

export function ReceiptScreen({ route }: any) {
  const { user } = useAuth();
  const { paymentId, receiptId } = route.params || {};
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        let res;
        if (receiptId) {
          res = await api.billing.getReceipt(receiptId, user.id);
        } else if (paymentId) {
          res = await api.billing.getPaymentReceipt(paymentId, user.id);
        }
        if (res) setReceipt(res.data);
      } catch {
        Alert.alert('Error', 'Could not load receipt.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user, paymentId, receiptId]);

  const handleShare = async () => {
    if (!receipt) return;
    const payment = receipt.payment;
    const invoice = (payment as any)?.invoice;
    const tenant = invoice?.tenant;
    const property = invoice?.property;

    const text = [
      `--- PAYMENT RECEIPT ---`,
      `Receipt #: ${receipt.receiptNumber}`,
      `Date: ${new Date(receipt.issuedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`,
      ``,
      tenant ? `Tenant: ${tenant.name}` : '',
      property ? `Property: ${property.name}` : '',
      invoice ? `Invoice: ${invoice.invoiceNumber}` : '',
      ``,
      `Amount Paid: ₹${Number(receipt.amount).toLocaleString()}`,
      payment ? `Payment Method: ${payment.method?.replace('_', ' ')}` : '',
      payment?.referenceNo ? `Reference: ${payment.referenceNo}` : '',
      ``,
      `--- Thank you! ---`,
    ].filter(Boolean).join('\n');

    try {
      await Share.share({ message: text, title: `Receipt ${receipt.receiptNumber}` });
    } catch {
      // user cancelled
    }
  };

  const handleDownloadPdf = async () => {
    if (!receipt) return;

    if (!FileSystem || !Sharing) {
      Alert.alert('Not Available', 'PDF download is not available on this platform.');
      return;
    }

    setDownloading(true);
    try {
      const pdfUrl = api.billing.getReceiptPdfUrl(receipt.id);
      const fileName = `receipt-${receipt.receiptNumber}.pdf`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      const downloadResult = await FileSystem.downloadAsync(pdfUrl, fileUri, {
        headers: {
          Authorization: `Bearer ${require('../../services/api').default?.currentToken || ''}`,
        },
      });

      if (downloadResult.status !== 200) {
        throw new Error('Download failed');
      }

      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(downloadResult.uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Receipt ${receipt.receiptNumber}`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Downloaded', `Receipt saved to ${fileUri}`);
      }
    } catch (err: any) {
      Alert.alert('Download Failed', err.message || 'Could not download the PDF receipt.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!receipt) {
    return (
      <View style={styles.centered}>
        <Ionicons name="receipt-outline" size={48} color={colors.textLight} />
        <Text style={styles.emptyText}>Receipt not found</Text>
      </View>
    );
  }

  const payment = receipt.payment;
  const invoice = (payment as any)?.invoice;
  const tenant = invoice?.tenant;
  const property = invoice?.property;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Animated.View entering={FadeInDown.springify()} style={[styles.receiptCard, shadows.lg]}>
        <View style={styles.header}>
          <View style={styles.checkCircle}>
            <Ionicons name="checkmark" size={32} color={colors.white} />
          </View>
          <Text style={styles.title}>Payment Successful</Text>
          <Text style={styles.amount}>
            ₹{Number(receipt.amount).toLocaleString()}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.details}>
          <DetailRow label="Receipt Number" value={receipt.receiptNumber} />
          <DetailRow
            label="Date"
            value={new Date(receipt.issuedAt).toLocaleDateString('en-IN', {
              day: 'numeric', month: 'long', year: 'numeric',
            })}
          />
          {tenant && <DetailRow label="Tenant" value={tenant.name} />}
          {property && <DetailRow label="Property" value={property.name} />}
          {invoice && <DetailRow label="Invoice" value={invoice.invoiceNumber} />}
          {payment && (
            <DetailRow label="Payment Method" value={payment.method?.replace('_', ' ').toUpperCase()} />
          )}
          {payment?.referenceNo && (
            <DetailRow label="Reference" value={payment.referenceNo} />
          )}
        </View>

        <View style={styles.divider} />

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            This is a system-generated receipt. No signature required.
          </Text>
        </View>
      </Animated.View>

      <View style={styles.actions}>
        <Button
          title="Share Receipt"
          onPress={handleShare}
          size="lg"
          style={{ flex: 1 }}
        />
        <Button
          title={downloading ? 'Downloading...' : 'Download PDF'}
          onPress={handleDownloadPdf}
          loading={downloading}
          disabled={downloading}
          size="lg"
          style={{ flex: 1 }}
        />
      </View>
    </ScrollView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },
  centered: {
    flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  emptyText: { fontSize: 14, color: colors.textSecondary },

  receiptCard: {
    backgroundColor: colors.white, borderRadius: 20, overflow: 'hidden',
  },
  header: { alignItems: 'center', padding: 30, backgroundColor: colors.successLight },
  checkCircle: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: colors.success,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  title: { fontSize: 18, fontWeight: '700', color: colors.success, marginBottom: 8 },
  amount: { fontSize: 32, fontWeight: '800', color: colors.text },

  divider: { height: 1, backgroundColor: colors.borderLight, marginHorizontal: 20 },

  details: { padding: 20 },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  detailLabel: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  detailValue: { fontSize: 14, fontWeight: '600', color: colors.text, textAlign: 'right', maxWidth: '55%' },

  footer: { padding: 20, alignItems: 'center' },
  footerText: { fontSize: 12, color: colors.textLight, textAlign: 'center', fontStyle: 'italic' },

  actions: { flexDirection: 'row', marginTop: 20, gap: 12 },
});
