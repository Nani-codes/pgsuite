import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { EmptyState } from '../../components/EmptyState';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

const statusColors: Record<string, { bg: string; text: string }> = {
  open: { bg: '#FEE2E2', text: '#991B1B' },
  in_progress: { bg: '#FEF3C7', text: '#92400E' },
  resolved: { bg: '#D1FAE5', text: '#065F46' },
  closed: { bg: '#E2E8F0', text: '#475569' },
};

const categoryIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  plumbing: 'water-outline',
  electrical: 'flash-outline',
  wifi: 'wifi-outline',
  cleaning: 'sparkles-outline',
  furniture: 'bed-outline',
  security: 'shield-outline',
  other: 'help-circle-outline',
};

export function ComplaintsScreen() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    if (!user) return;
    try {
      const res = await api.complaints.list(user.id, user.role);
      setComplaints(res.data);
    } catch (err) {
      console.error(err);
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

  const renderComplaint = ({ item }: { item: any }) => {
    const sc = statusColors[item.status] || statusColors.open;
    const icon = categoryIcons[item.category] || 'help-circle-outline';

    return (
      <Card style={styles.complaintCard}>
        <View style={styles.complaintHeader}>
          <View style={[styles.iconBg, { backgroundColor: sc.bg }]}>
            <Ionicons name={icon} size={20} color={sc.text} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.complaintTitle}>{item.title}</Text>
            <Text style={styles.category}>{item.category}</Text>
          </View>
          <Badge label={item.status.replace('_', ' ')} color={sc.bg} textColor={sc.text} />
        </View>
        <Text style={styles.description} numberOfLines={2}>
          {item.description}
        </Text>
        {item.tenant && (
          <View style={styles.tenantRow}>
            <Ionicons name="person-outline" size={12} color={colors.textLight} />
            <Text style={styles.tenantName}>{item.tenant.name}</Text>
          </View>
        )}
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={complaints}
        renderItem={renderComplaint}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <Text style={styles.title}>Complaints</Text>
        }
        ListEmptyComponent={
          <EmptyState
            icon="chatbubble-ellipses-outline"
            title="No complaints"
            subtitle="All quiet! No complaints have been raised."
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 16 },
  complaintCard: { marginBottom: 12 },
  complaintHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  complaintTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  category: { fontSize: 12, color: colors.textLight, marginTop: 2, textTransform: 'capitalize' },
  description: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 10,
    lineHeight: 18,
  },
  tenantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  tenantName: { fontSize: 12, color: colors.textLight },
});
