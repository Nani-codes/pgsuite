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
import type { Booking } from '../../types';

const statusColors: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#FEF3C7', text: '#92400E' },
  confirmed: { bg: '#D1FAE5', text: '#065F46' },
  cancelled: { bg: '#FEE2E2', text: '#991B1B' },
  converted: { bg: '#E0E7FF', text: '#312E81' },
};

export function BookingsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filter, setFilter] = useState<string | undefined>(undefined);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.bookings.list(user.id, filter);
      setBookings(res.data);
    } catch (err) {
      console.error(err);
    }
  }, [user, filter]);

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

  const filters = [
    { label: 'All', value: undefined },
    { label: 'Pending', value: 'pending' },
    { label: 'Confirmed', value: 'confirmed' },
    { label: 'Converted', value: 'converted' },
  ];

  const renderBooking = ({ item }: { item: Booking }) => {
    const sc = statusColors[item.status] || statusColors.pending;
    return (
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <Ionicons name="calendar-outline" size={20} color={colors.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.phone}>
              <Ionicons name="call-outline" size={12} color={colors.textLight} />{' '}
              {item.phone}
            </Text>
          </View>
          <Badge label={item.status} color={sc.bg} textColor={sc.text} />
        </View>

        <View style={styles.details}>
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Ionicons name="business-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.detailText}>{item.property?.name || 'N/A'}</Text>
            </View>
            {item.bed && (
              <View style={styles.detailItem}>
                <Ionicons name="bed-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.detailText}>
                  Room {item.bed.room?.roomNumber} · {item.bed.label}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.detailText}>
                Check-in: {new Date(item.expectedCheckIn).toLocaleDateString('en-IN')}
              </Text>
            </View>
          </View>
          <View style={styles.rentRow}>
            <Text style={styles.rentLabel}>Rent</Text>
            <Text style={styles.rentAmount}>₹{Number(item.rentAmount).toLocaleString()}/mo</Text>
          </View>
          {item.advanceAmount > 0 && (
            <View style={styles.advanceRow}>
              <Text style={styles.advanceLabel}>
                Advance: ₹{Number(item.advanceAmount).toLocaleString()}
              </Text>
              <Badge
                label={item.advancePaid ? 'Paid' : 'Pending'}
                color={item.advancePaid ? '#D1FAE5' : '#FEF3C7'}
                textColor={item.advancePaid ? '#065F46' : '#92400E'}
              />
            </View>
          )}
        </View>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={bookings}
        renderItem={renderBooking}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <Text style={styles.title}>Bookings</Text>
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => navigation.navigate('AddBooking')}
              >
                <Ionicons name="add" size={20} color={colors.white} />
                <Text style={styles.addBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.filterRow}>
              {filters.map((f) => (
                <TouchableOpacity
                  key={f.label}
                  style={[styles.filterChip, filter === f.value && styles.filterChipActive]}
                  onPress={() => setFilter(f.value)}
                >
                  <Text
                    style={[styles.filterText, filter === f.value && styles.filterTextActive]}
                  >
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="calendar-outline"
            title="No bookings yet"
            subtitle="Add a booking when someone reserves a bed"
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
    marginBottom: 12,
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
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.surfaceAlt,
  },
  filterChipActive: { backgroundColor: colors.primary },
  filterText: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  filterTextActive: { color: colors.white },
  card: { marginBottom: 12 },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.reserved,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontSize: 16, fontWeight: '600', color: colors.text },
  phone: { fontSize: 13, color: colors.textLight, marginTop: 2 },
  details: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  detailRow: { flexDirection: 'row', gap: 16, flexWrap: 'wrap', marginBottom: 6 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailText: { fontSize: 13, color: colors.textSecondary },
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
  advanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  advanceLabel: { fontSize: 13, color: colors.textSecondary },
});
