import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { Card } from '../../components/Card';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

export function TenantDocumentsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      api.tenants.get(user.id, user.id).then((res) => {
        setDocuments(res.data?.documents || []);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [user]);

  const docTypes: Record<string, { label: string; icon: any }> = {
    aadhaar: { label: 'Aadhaar Card', icon: 'card-outline' },
    pan: { label: 'PAN Card', icon: 'document-outline' },
    passport: { label: 'Passport', icon: 'airplane-outline' },
    driving_licence: { label: 'Driving License', icon: 'car-outline' },
    other: { label: 'Other Document', icon: 'document-attach-outline' },
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
      {documents.length === 0 ? (
        <Card variant="elevated" style={styles.emptyCard}>
          <Ionicons name="folder-open-outline" size={48} color={colors.textLight} />
          <Text style={styles.emptyTitle}>No Documents</Text>
          <Text style={styles.emptyText}>
            Your property documents will appear here
          </Text>
        </Card>
      ) : (
        documents.map((doc) => {
          const docInfo = docTypes[doc.docType] || docTypes.other;
          return (
            <Card key={doc.id} style={styles.docCard}>
              <View style={styles.docIcon}>
                <Ionicons name={docInfo.icon} size={24} color={colors.primary} />
              </View>
              <View style={styles.docInfo}>
                <Text style={styles.docType}>{docInfo.label}</Text>
                <Text style={styles.docStatus}>
                  {doc.verified ? 'Verified' : 'Pending verification'}
                </Text>
              </View>
              <View style={[
                styles.docBadge,
                { backgroundColor: doc.verified ? colors.vacant + '20' : colors.warning + '20' }
              ]}>
                <Ionicons 
                  name={doc.verified ? 'checkmark-circle' : 'time-outline'} 
                  size={16} 
                  color={doc.verified ? colors.vacant : colors.warning} 
                />
              </View>
            </Card>
          );
        })
      )}

      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>Document Guidelines</Text>
        <View style={styles.infoItem}>
          <Ionicons name="checkmark" size={16} color={colors.vacant} />
          <Text style={styles.infoText}>Upload clear, readable photos</Text>
        </View>
        <View style={styles.infoItem}>
          <Ionicons name="checkmark" size={16} color={colors.vacant} />
          <Text style={styles.infoText}>Ensure all text is visible</Text>
        </View>
        <View style={styles.infoItem}>
          <Ionicons name="checkmark" size={16} color={colors.vacant} />
          <Text style={styles.infoText}>Files should be less than 5MB</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 32 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: colors.textSecondary },
  emptyCard: { alignItems: 'center', padding: 40, marginTop: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginTop: 16 },
  emptyText: { fontSize: 14, color: colors.textSecondary, marginTop: 8, textAlign: 'center' },
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  docIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docInfo: { flex: 1 },
  docType: { fontSize: 15, fontWeight: '600', color: colors.text },
  docStatus: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  docBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoSection: { marginTop: 24, padding: 16, backgroundColor: colors.surfaceAlt, borderRadius: 12 },
  infoTitle: { fontSize: 14, fontWeight: '600', color: colors.textSecondary, marginBottom: 12 },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  infoText: { fontSize: 13, color: colors.textSecondary },
});