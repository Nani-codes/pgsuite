import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadows } from '../../theme/colors';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { StatCard } from '../../components/StatCard';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

const statusColors: Record<string, { bg: string; text: string }> = {
  vacant: { bg: '#D1FAE5', text: '#065F46' },
  occupied: { bg: '#FEE2E2', text: '#991B1B' },
  reserved: { bg: '#FEF3C7', text: '#92400E' },
};

export function PropertyDetailScreen({ route }: any) {
  const { user } = useAuth();
  const { propertyId } = route.params;
  const [property, setProperty] = useState<any>(null);
  const [vacancy, setVacancy] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [roomNumber, setRoomNumber] = useState('');
  const [roomType, setRoomType] = useState<'single' | 'double' | 'triple'>('double');
  const [rentAmount, setRentAmount] = useState('');
  const [addingRoom, setAddingRoom] = useState(false);

  const loadData = async () => {
    if (!user) return;
    try {
      const [prop, vac] = await Promise.all([
        api.properties.get(propertyId, user.id),
        api.properties.getVacancy(propertyId, user.id),
      ]);
      setProperty(prop.data);
      setVacancy(vac.data);
    } catch (err) {
      console.error(err);
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

  if (!property) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Loading...</Text>
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
      >
        <View style={styles.propertyHeader}>
          <Text style={styles.propertyName}>{property.name}</Text>
          <Text style={styles.propertyAddress}>
            <Ionicons name="location" size={14} color={colors.textSecondary} />
            {' '}{property.address}, {property.city}
          </Text>
          {property.amenities?.length > 0 && (
            <View style={styles.amenities}>
              {property.amenities.map((a: string) => (
                <View key={a} style={styles.amenityChip}>
                  <Text style={styles.amenityText}>{a}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {vacancy && (
          <View style={styles.statsRow}>
            <StatCard
              title="Total Beds"
              value={vacancy.total}
              icon="bed-outline"
              iconColor={colors.primary}
            />
            <StatCard
              title="Occupied"
              value={vacancy.occupied}
              icon="person-outline"
              iconColor={colors.occupied}
              iconBg={colors.occupied + '20'}
            />
            <StatCard
              title="Vacant"
              value={vacancy.vacant}
              icon="checkmark-circle-outline"
              iconColor={colors.vacant}
              iconBg={colors.vacant + '20'}
            />
          </View>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Rooms ({property.rooms?.length || 0})
          </Text>
          <Button
            title="+ Add Room"
            onPress={() => setShowAddRoom(true)}
            size="sm"
            style={{ paddingHorizontal: 14 }}
          />
        </View>

        {property.rooms?.map((room: any) => (
          <Card key={room.id} style={styles.roomCard}>
            <View style={styles.roomHeader}>
              <View style={styles.roomNumberBadge}>
                <Text style={styles.roomNumberText}>{room.roomNumber}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.roomType}>
                  {room.roomType.charAt(0).toUpperCase() + room.roomType.slice(1)} Room
                </Text>
                <Text style={styles.roomRent}>
                  ₹{Number(room.rentAmount).toLocaleString()}/month
                </Text>
              </View>
              {room.floor && (
                <Badge label={room.floor.label} />
              )}
            </View>
            <View style={styles.bedsRow}>
              {room.beds?.map((bed: any) => {
                const sc = statusColors[bed.status] || statusColors.vacant;
                return (
                  <View
                    key={bed.id}
                    style={[styles.bedChip, { backgroundColor: sc.bg }]}
                  >
                    <Ionicons
                      name={bed.status === 'occupied' ? 'person' : 'bed-outline'}
                      size={14}
                      color={sc.text}
                    />
                    <Text style={[styles.bedLabel, { color: sc.text }]}>
                      {bed.label}
                    </Text>
                    <Text style={[styles.bedStatus, { color: sc.text }]}>
                      {bed.status}
                    </Text>
                  </View>
                );
              })}
            </View>
          </Card>
        ))}

        {property.floors?.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Floors</Text>
            {property.floors.map((floor: any) => (
              <Card key={floor.id} style={styles.floorCard}>
                <Ionicons name="layers-outline" size={18} color={colors.primary} />
                <Text style={styles.floorLabel}>{floor.label}</Text>
              </Card>
            ))}
          </>
        )}
      </ScrollView>

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
                  <Text style={[styles.bedCount, roomType === t && { color: colors.white }]}>
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
              <Button
                title="Cancel"
                onPress={() => setShowAddRoom(false)}
                variant="outline"
                style={{ flex: 1 }}
              />
              <Button
                title="Create Room"
                onPress={handleAddRoom}
                loading={addingRoom}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 32 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: colors.textSecondary },
  propertyHeader: { marginBottom: 16 },
  propertyName: { fontSize: 24, fontWeight: '700', color: colors.text },
  propertyAddress: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  amenities: { flexDirection: 'row', gap: 6, marginTop: 12, flexWrap: 'wrap' },
  amenityChip: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  amenityText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  roomCard: { marginBottom: 12 },
  roomHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  roomNumberBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomNumberText: { fontSize: 16, fontWeight: '700', color: colors.text },
  roomType: { fontSize: 15, fontWeight: '600', color: colors.text },
  roomRent: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  bedsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    flexWrap: 'wrap',
  },
  bedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  bedLabel: { fontSize: 12, fontWeight: '600' },
  bedStatus: { fontSize: 11, textTransform: 'capitalize' },
  floorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  floorLabel: { fontSize: 15, fontWeight: '500', color: colors.text },
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
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 20 },
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
  typeChipActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  typeChipText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  typeChipTextActive: { color: colors.white },
  bedCount: { fontSize: 11, color: colors.textLight, marginTop: 2 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
});
