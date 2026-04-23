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
import type { DuesPackage } from '../../types';

const frequencyLabels: Record<string, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  half_yearly: 'Half Yearly',
  yearly: 'Yearly',
};

export function DuesPackagesScreen({ navigation }: any) {
  const { user } = useAuth();
  const [packages, setPackages] = useState<DuesPackage[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.duesPackages.list(user.id);
      setPackages(res.data);
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

  const renderPackage = ({ item }: { item: DuesPackage }) => (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Ionicons name="receipt-outline" size={20} color={colors.white} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.frequency}>
            {frequencyLabels[item.frequency] || item.frequency}
          </Text>
        </View>
        <View style={styles.amountContainer}>
          <Text style={styles.amount}>₹{Number(item.totalAmount).toLocaleString()}</Text>
          <Badge
            label={item.isActive ? 'Active' : 'Inactive'}
            color={item.isActive ? '#D1FAE5' : '#FEE2E2'}
            textColor={item.isActive ? '#065F46' : '#991B1B'}
          />
        </View>
      </View>

      <View style={styles.details}>
        <Text style={styles.sectionLabel}>Items</Text>
        {item.items?.map((pkg, index) => (
          <View key={pkg.id || index} style={styles.itemRow}>
            <View style={styles.itemDot} />
            <Text style={styles.itemDesc}>{pkg.description}</Text>
            <Text style={styles.itemAmount}>₹{Number(pkg.amount).toLocaleString()}</Text>
          </View>
        ))}
      </View>

      {item.property && (
        <View style={styles.propertyRow}>
          <Ionicons name="business-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.propertyText}>{item.property.name}</Text>
        </View>
      )}

      {item._count && (
        <View style={styles.leaseCount}>
          <Ionicons name="people-outline" size={14} color={colors.primary} />
          <Text style={styles.leaseCountText}>
            {item._count.leases} active {item._count.leases === 1 ? 'lease' : 'leases'}
          </Text>
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn}>
          <Ionicons name="create-outline" size={16} color={colors.primary} />
          <Text style={styles.actionText}>Edit</Text>
        </TouchableOpacity>
        {item.autoGenerate && (
          <View style={styles.autoBadge}>
            <Ionicons name="sync-outline" size={12} color={colors.success} />
            <Text style={styles.autoText}>Auto-generate</Text>
          </View>
        )}
      </View>
    </Card>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={packages}
        renderItem={renderPackage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Dues Packages</Text>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => navigation.navigate('AddDuesPackage')}
            >
              <Ionicons name="add" size={20} color={colors.white} />
              <Text style={styles.addBtnText}>Create</Text>
            </TouchableOpacity>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="receipt-outline"
            title="No dues packages"
            subtitle="Create recurring charge templates for your tenants"
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
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  addBtnText: { color: colors.white, fontWeight: '600', fontSize: 14 },
  card: { marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontSize: 16, fontWeight: '600', color: colors.text },
  frequency: { fontSize: 13, color: colors.textLight, marginTop: 2 },
  amountContainer: { alignItems: 'flex-end', gap: 4 },
  amount: { fontSize: 18, fontWeight: '700', color: colors.primary },
  details: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 8,
  },
  itemDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  itemDesc: { flex: 1, fontSize: 14, color: colors.text },
  itemAmount: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  propertyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  propertyText: { fontSize: 13, color: colors.textSecondary },
  leaseCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  leaseCountText: { fontSize: 13, color: colors.primary, fontWeight: '500' },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { fontSize: 13, color: colors.primary, fontWeight: '500' },
  autoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.successLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  autoText: { fontSize: 11, color: colors.success, fontWeight: '600' },
});
