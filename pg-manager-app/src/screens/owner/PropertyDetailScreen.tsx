import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  Dimensions,
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadows } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import type { Property, Room, Bed } from '../../types';

type FilterType = 'all' | 'available' | 'full' | 'maintenance';

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All Rooms' },
  { key: 'available', label: 'Available' },
  { key: 'full', label: 'Full' },
  { key: 'maintenance', label: 'Maintenance' },
];

const AVATAR_COLORS = [
  '#4355B9',
  '#065F46',
  '#991B1B',
  '#92400E',
  '#6C3400',
  '#785900',
];

function getRoomStatus(room: Room): 'available' | 'full' | 'maintenance' {
  const beds = room.beds || [];
  if (beds.length === 0) return 'available';
  if (beds.some((b) => b.status === 'reserved')) return 'maintenance';
  if (beds.every((b) => b.status === 'occupied')) return 'full';
  return 'available';
}

function getOccupiedCount(room: Room): number {
  return (room.beds || []).filter((b) => b.status === 'occupied').length;
}

function getTotalBeds(room: Room): number {
  return (room.beds || []).length;
}

export function PropertyDetailScreen({ route }: any) {
  const { user } = useAuth();
  const { propertyId } = route.params;
  const [property, setProperty] = useState<Property | null>(null);
  const [vacancy, setVacancy] = useState<{
    total: number;
    occupied: number;
    vacant: number;
  } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [roomNumber, setRoomNumber] = useState('');
  const [roomType, setRoomType] = useState<'single' | 'double' | 'triple'>(
    'double',
  );
  const [rentAmount, setRentAmount] = useState('');
  const [addingRoom, setAddingRoom] = useState(false);

  const loadData = async () => {
    if (!user) return;
    setError(null);
    try {
      const [prop, vac] = await Promise.all([
        api.properties.get(propertyId, user.id),
        api.properties.getVacancy(propertyId, user.id),
      ]);
      setProperty(prop.data);
      setVacancy(vac.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load property');
    }
  };

  useEffect(() => {
    loadData();
  }, [propertyId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleAddRoom = async () => {
    if (!roomNumber || !rentAmount) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setAddingRoom(true);
    try {
      await api.properties.createRoom(propertyId, user!.id, {
        roomNumber,
        roomType,
        rentAmount: Number(rentAmount),
      });
      setShowAddRoom(false);
      setRoomNumber('');
      setRentAmount('');
      await loadData();
      Alert.alert('Success', 'Room created with beds');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setAddingRoom(false);
    }
  };

  const rooms = property?.rooms || [];

  const filteredRooms = useMemo(() => {
    switch (filter) {
      case 'available':
        return rooms.filter((r) => getRoomStatus(r) === 'available');
      case 'full':
        return rooms.filter((r) => getRoomStatus(r) === 'full');
      case 'maintenance':
        return rooms.filter((r) => getRoomStatus(r) === 'maintenance');
      default:
        return rooms;
    }
  }, [rooms, filter]);

  const maintenanceCount = useMemo(
    () => rooms.filter((r) => getRoomStatus(r) === 'maintenance').length,
    [rooms],
  );

  const occupancyRate =
    vacancy && vacancy.total > 0
      ? Math.round((vacancy.occupied / vacancy.total) * 100)
      : 0;

  if (!property && !error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Ionicons
          name="alert-circle-outline"
          size={48}
          color={colors.textLight}
        />
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorSub}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadData}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.supraLabel}>INVENTORY MANAGEMENT</Text>
          <Text style={styles.title}>Room Directory</Text>
          {property && (
            <Text style={styles.subtitle}>{property.name}</Text>
          )}
        </View>

        {/* Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersRow}
          style={styles.filtersScroll}
        >
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setFilter(f.key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.chipText, active && styles.chipTextActive]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Stats 2x2 Grid */}
        {vacancy && (
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>TOTAL UNITS</Text>
              <Text style={styles.statValue}>{rooms.length}</Text>
            </View>
            <View style={[styles.statCard, styles.statCardAccent]}>
              <Text style={styles.statLabel}>AVAILABLE BEDS</Text>
              <Text style={styles.statValue}>{vacancy.vacant}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>OCCUPANCY RATE</Text>
              <Text style={styles.statValue}>{occupancyRate}%</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>UNDER SERVICE</Text>
              <Text style={styles.statValue}>{maintenanceCount}</Text>
            </View>
          </View>
        )}

        {/* Room Cards */}
        {filteredRooms.length === 0 && (
          <View style={styles.emptyWrap}>
            <Ionicons
              name="grid-outline"
              size={48}
              color={colors.textLight}
            />
            <Text style={styles.emptyTitle}>
              {rooms.length === 0
                ? 'No rooms yet'
                : 'No rooms match this filter'}
            </Text>
            <Text style={styles.emptySub}>
              {rooms.length === 0
                ? 'Add rooms to start assigning beds to tenants'
                : 'Try selecting a different filter'}
            </Text>
          </View>
        )}

        {filteredRooms.map((room, idx) => {
          const status = getRoomStatus(room);
          const occupied = getOccupiedCount(room);
          const total = getTotalBeds(room);
          const progress = total > 0 ? occupied / total : 0;
          const occupiedBeds = (room.beds || []).filter(
            (b) => b.status === 'occupied',
          );
          const isMaintenance = status === 'maintenance';

          const badgeStyle =
            status === 'available'
              ? { bg: colors.vacantBg, text: colors.vacant }
              : status === 'full'
                ? { bg: colors.indigo100, text: colors.primary }
                : {
                    bg: colors.secondaryContainer,
                    text: colors.onSecondaryContainer,
                  };
          const badgeLabel =
            status === 'available'
              ? 'Available'
              : status === 'full'
                ? 'Full'
                : 'Maintenance';

          const roomTypeLabel =
            room.roomType.charAt(0).toUpperCase() +
            room.roomType.slice(1) +
            ' Room';

          return (
            <Animated.View
              key={room.id}
              entering={FadeInUp.delay(idx * 60).duration(400)}
              style={[
                styles.roomCard,
                isMaintenance && styles.roomCardMaintenance,
              ]}
            >
              {/* Top row */}
              <View style={styles.roomTop}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.roomNumber,
                      isMaintenance && { color: colors.textSecondary },
                    ]}
                  >
                    Room {room.roomNumber}
                  </Text>
                  <Text style={styles.roomTypeText}>{roomTypeLabel}</Text>
                </View>
                <View
                  style={[styles.badge, { backgroundColor: badgeStyle.bg }]}
                >
                  <Text style={[styles.badgeText, { color: badgeStyle.text }]}>
                    {badgeLabel}
                  </Text>
                </View>
              </View>

              {/* Bed availability bar */}
              <View style={styles.barSection}>
                <View style={styles.barLabelRow}>
                  <Text
                    style={[
                      styles.barLabel,
                      isMaintenance && { color: colors.textSecondary },
                    ]}
                  >
                    {isMaintenance ? 'Service Status' : 'Bed Availability'}
                  </Text>
                  <Text
                    style={[
                      styles.barValue,
                      isMaintenance && { color: colors.secondary },
                    ]}
                  >
                    {isMaintenance
                      ? 'Reserved'
                      : `${occupied}/${total} Occupied`}
                  </Text>
                </View>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      { width: `${Math.round(progress * 100)}%` as any },
                      isMaintenance && {
                        backgroundColor: colors.secondaryContainer,
                      },
                    ]}
                  />
                </View>
              </View>

              {/* Occupants */}
              <View style={styles.occupantsSection}>
                {isMaintenance ? (
                  <View style={styles.maintenanceRow}>
                    <Ionicons
                      name="construct-outline"
                      size={14}
                      color={colors.textSecondary}
                    />
                    <Text style={styles.maintenanceText}>
                      UNAVAILABLE FOR BOOKING
                    </Text>
                  </View>
                ) : (
                  <>
                    <Text style={styles.occupantsLabel}>
                      CURRENT OCCUPANTS
                    </Text>
                    {occupiedBeds.length > 0 ? (
                      <View style={styles.initialsRow}>
                        {occupiedBeds.map((bed, i) => (
                          <View
                            key={bed.id}
                            style={[
                              styles.initialsCircle,
                              {
                                backgroundColor:
                                  AVATAR_COLORS[i % AVATAR_COLORS.length],
                              },
                              i > 0 && { marginLeft: -8 },
                            ]}
                          >
                            <Text style={styles.initialsText}>
                              {bed.label.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text style={styles.noOccupants}>
                        No active occupants
                      </Text>
                    )}
                  </>
                )}
              </View>
            </Animated.View>
          );
        })}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => setShowAddRoom(true)}
      >
        <Ionicons name="add" size={28} color={colors.onSecondaryContainer} />
      </TouchableOpacity>

      {/* Add Room Modal */}
      <Modal visible={showAddRoom} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Room</Text>

            <Text style={styles.inputLabel}>Room Number</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 301"
              value={roomNumber}
              onChangeText={setRoomNumber}
              placeholderTextColor={colors.textLight}
            />

            <Text style={styles.inputLabel}>Room Type</Text>
            <View style={styles.typeRow}>
              {(['single', 'double', 'triple'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.typeChip,
                    roomType === t && styles.typeChipActive,
                  ]}
                  onPress={() => setRoomType(t)}
                >
                  <Text
                    style={[
                      styles.typeChipText,
                      roomType === t && styles.typeChipTextActive,
                    ]}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                  <Text
                    style={[
                      styles.bedCountText,
                      roomType === t && { color: colors.white },
                    ]}
                  >
                    {{ single: '1 bed', double: '2 beds', triple: '3 beds' }[t]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Rent (₹/month)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 8000"
              value={rentAmount}
              onChangeText={setRentAmount}
              keyboardType="numeric"
              placeholderTextColor={colors.textLight}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnOutline]}
                onPress={() => setShowAddRoom(false)}
              >
                <Text style={styles.modalBtnOutlineText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  styles.modalBtnPrimary,
                  addingRoom && { opacity: 0.6 },
                ]}
                onPress={handleAddRoom}
                disabled={addingRoom}
              >
                <Text style={styles.modalBtnPrimaryText}>
                  {addingRoom ? 'Creating...' : 'Create Room'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const { width: SCREEN_W } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 100 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: { color: colors.textSecondary, fontSize: 15 },

  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: 12,
  },
  errorSub: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  retryBtnText: { color: colors.primary, fontWeight: '600', fontSize: 14 },

  header: { marginBottom: 20 },
  supraLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: colors.primary,
    marginBottom: 6,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: 4,
    fontWeight: '500',
  },

  filtersScroll: { marginBottom: 24 },
  filtersRow: { gap: 8 },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainerHigh,
  },
  chipActive: { backgroundColor: colors.indigo900 },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  chipTextActive: { color: colors.white },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 28,
  },
  statCard: {
    width: (SCREEN_W - 50) / 2,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    padding: 18,
  },
  statCardAccent: {
    borderLeftWidth: 4,
    borderLeftColor: colors.secondaryContainer,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textLight,
    letterSpacing: 1,
    marginBottom: 6,
  },
  statValue: { fontSize: 28, fontWeight: '800', color: colors.text },

  emptyWrap: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },

  roomCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 14,
    ...shadows.md,
  },
  roomCardMaintenance: {
    backgroundColor: colors.surfaceAlt,
    opacity: 0.85,
    ...shadows.sm,
  },
  roomTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  roomNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.indigo900,
  },
  roomTypeText: {
    fontSize: 13,
    color: colors.textLight,
    fontWeight: '500',
    marginTop: 2,
  },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  barSection: { marginBottom: 20 },
  barLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  barLabel: { fontSize: 13, fontWeight: '600', color: colors.text },
  barValue: { fontSize: 13, fontWeight: '700', color: colors.primary },
  barTrack: {
    height: 6,
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: 6,
    backgroundColor: colors.primary,
    borderRadius: 3,
  },

  occupantsSection: {
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  occupantsLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textLight,
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  initialsRow: { flexDirection: 'row', alignItems: 'center' },
  initialsCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  initialsText: { color: colors.white, fontSize: 13, fontWeight: '700' },
  noOccupants: { fontSize: 13, color: colors.textLight, fontStyle: 'italic' },
  maintenanceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  maintenanceText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 1.2,
  },

  fab: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    ...shadows.lg,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
    marginTop: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeChip: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
  },
  typeChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  typeChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  typeChipTextActive: { color: colors.white },
  bedCountText: { fontSize: 11, color: colors.textLight, marginTop: 2 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnOutline: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: 'transparent',
  },
  modalBtnOutlineText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  modalBtnPrimary: { backgroundColor: colors.primary },
  modalBtnPrimaryText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
});
