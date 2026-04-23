import React, { useState, useCallback } from 'react';
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
import { EmptyState } from '../../components/EmptyState';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import type { Tenant } from '../../types';

export function OldTenantsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.tenants.list(user.id, 'checked_out');
      setTenants(res.data);
    } catch (err) {
      console.error(err);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const renderTenant = ({ item }: { item: Tenant }) => {
    const lastLease = item.leases?.[0];

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => navigation.navigate('TenantDetail', { tenantId: item.id })}
      >
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {item.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.phone}>
                <Ionicons name="call-outline" size={12} color={colors.textLight} />{' '}
                {item.phone}
              </Text>
            </View>
            <Badge label="Checked Out" color="#E2E8F0" textColor="#475569" />
          </View>

          {lastLease && (
            <View style={styles.details}>
              <View style={styles.detailRow}>
                <View style={styles.detailItem}>
                  <Ionicons name="business-outline" size={14} color={colors.textSecondary} />
                  <Text style={styles.detailText}>
                    {lastLease.property?.name || 'Property'}
                  </Text>
                </View>
                {lastLease.bed && (
                  <View style={styles.detailItem}>
                    <Ionicons name="bed-outline" size={14} color={colors.textSecondary} />
                    <Text style={styles.detailText}>
                      Room {lastLease.bed.room?.roomNumber}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.dateRow}>
                <View style={styles.dateItem}>
                  <Text style={styles.dateLabel}>Move In</Text>
                  <Text style={styles.dateValue}>
                    {new Date(lastLease.moveInDate).toLocaleDateString('en-IN')}
                  </Text>
                </View>
                {lastLease.moveOutDate && (
                  <View style={styles.dateItem}>
                    <Text style={styles.dateLabel}>Move Out</Text>
                    <Text style={styles.dateValue}>
                      {new Date(lastLease.moveOutDate).toLocaleDateString('en-IN')}
                    </Text>
                  </View>
                )}
                <View style={styles.dateItem}>
                  <Text style={styles.dateLabel}>Deposit</Text>
                  <Badge
                    label={lastLease.depositStatus}
                    color={lastLease.depositStatus === 'refunded' ? '#D1FAE5' : '#FEF3C7'}
                    textColor={lastLease.depositStatus === 'refunded' ? '#065F46' : '#92400E'}
                  />
                </View>
              </View>
            </View>
          )}
        </Card>
      </TouchableOpacity>
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
            <Text style={styles.title}>Old Tenants</Text>
            <Text style={styles.count}>{tenants.length} total</Text>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title="No old tenants"
            subtitle="Checked-out tenants will appear here"
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
  count: { fontSize: 14, color: colors.textLight },
  card: { marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: colors.white },
  name: { fontSize: 16, fontWeight: '600', color: colors.text },
  phone: { fontSize: 13, color: colors.textLight, marginTop: 2 },
  details: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  detailRow: { flexDirection: 'row', gap: 16, flexWrap: 'wrap', marginBottom: 8 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailText: { fontSize: 13, color: colors.textSecondary },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceAlt,
    padding: 10,
    borderRadius: 8,
  },
  dateItem: { alignItems: 'center', gap: 4 },
  dateLabel: { fontSize: 11, color: colors.textLight, textTransform: 'uppercase' },
  dateValue: { fontSize: 13, fontWeight: '600', color: colors.text },
});
