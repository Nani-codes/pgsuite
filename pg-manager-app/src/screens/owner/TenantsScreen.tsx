import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

const statusBadgeColors: Record<string, { bg: string; text: string }> = {
  active: { bg: '#D1FAE5', text: '#065F46' },
  checked_out: { bg: '#E2E8F0', text: '#475569' },
  suspended: { bg: '#FEE2E2', text: '#991B1B' },
};

export function TenantsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [tenants, setTenants] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    if (!user) return;
    try {
      const res = await api.tenants.list(user.id);
      setTenants(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [user]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const renderTenant = ({ item }: { item: any }) => {
    const activeLease = item.leases?.find((l: any) => l.status === 'active');
    const sc = statusBadgeColors[item.status] || statusBadgeColors.active;

    return (
      <Card style={styles.tenantCard}>
        <View style={styles.tenantHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.tenantName}>{item.name}</Text>
            <Text style={styles.tenantPhone}>
              <Ionicons name="call-outline" size={12} color={colors.textLight} />
              {' '}{item.phone}
            </Text>
          </View>
          <Badge label={item.status} color={sc.bg} textColor={sc.text} />
        </View>

        {activeLease && (
          <View style={styles.leaseInfo}>
            <View style={styles.leaseRow}>
              <View style={styles.leaseItem}>
                <Ionicons name="business-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.leaseText}>
                  {activeLease.property?.name || 'Property'}
                </Text>
              </View>
              <View style={styles.leaseItem}>
                <Ionicons name="bed-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.leaseText}>
                  Room {activeLease.bed?.room?.roomNumber} · {activeLease.bed?.label}
                </Text>
              </View>
            </View>
            <View style={styles.rentRow}>
              <Text style={styles.rentLabel}>Rent</Text>
              <Text style={styles.rentAmount}>
                ₹{Number(activeLease.rentAmount).toLocaleString()}/mo
              </Text>
            </View>
          </View>
        )}
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={tenants}
        renderItem={renderTenant}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Tenants</Text>
            <Button
              title="+ Add Tenant"
              onPress={() => navigation.navigate('AddTenant')}
              size="sm"
              style={{ paddingHorizontal: 14 }}
            />
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title="No tenants yet"
            subtitle="Add your first tenant to get started"
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: 16, paddingBottom: 32 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  tenantCard: { marginBottom: 12 },
  tenantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: colors.white },
  tenantName: { fontSize: 16, fontWeight: '600', color: colors.text },
  tenantPhone: { fontSize: 13, color: colors.textLight, marginTop: 2 },
  leaseInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  leaseRow: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  leaseItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  leaseText: { fontSize: 13, color: colors.textSecondary },
  rentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: colors.surfaceAlt,
    padding: 10,
    borderRadius: 8,
  },
  rentLabel: { fontSize: 13, color: colors.textSecondary },
  rentAmount: { fontSize: 16, fontWeight: '700', color: colors.primary },
});
