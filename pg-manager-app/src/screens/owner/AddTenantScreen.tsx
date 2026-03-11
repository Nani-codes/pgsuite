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
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

export function AddTenantScreen({ navigation }: any) {
  const { user } = useAuth();
  const [properties, setProperties] = useState<any[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedBed, setSelectedBed] = useState<any>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [rentAmount, setRentAmount] = useState('');
  const [billingDay, setBillingDay] = useState('1');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      api.properties.list(user.id).then((res) => setProperties(res.data));
    }
  }, [user]);

  useEffect(() => {
    if (selectedProperty && user) {
      api.properties.getRooms(selectedProperty.id, user.id).then((res) => {
        setRooms(res.data);
        setSelectedBed(null);
      });
    }
  }, [selectedProperty]);

  const handleSubmit = async () => {
    if (!name || !phone || !selectedBed || !rentAmount) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    setLoading(true);
    try {
      await api.tenants.create(user!.id, {
        name,
        phone,
        email: email || undefined,
        bedId: selectedBed.id,
        propertyId: selectedProperty.id,
        rentAmount: Number(rentAmount),
        billingDay: Number(billingDay),
        moveInDate: new Date().toISOString().split('T')[0],
      });
      Alert.alert('Success', `${name} has been added as a tenant`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const vacantBeds = rooms.flatMap((room) =>
    (room.beds || [])
      .filter((b: any) => b.status === 'vacant')
      .map((b: any) => ({ ...b, room })),
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Tenant Details</Text>

      <Text style={styles.label}>Full Name *</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter tenant's full name"
        value={name}
        onChangeText={setName}
        placeholderTextColor={colors.textLight}
      />

      <Text style={styles.label}>Phone Number *</Text>
      <TextInput
        style={styles.input}
        placeholder="10-digit phone number"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        maxLength={10}
        placeholderTextColor={colors.textLight}
      />

      <Text style={styles.label}>Email (optional)</Text>
      <TextInput
        style={styles.input}
        placeholder="email@example.com"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        placeholderTextColor={colors.textLight}
      />

      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Room Assignment</Text>

      <Text style={styles.label}>Select Property *</Text>
      <View style={styles.optionsRow}>
        {properties.map((p) => (
          <TouchableOpacity
            key={p.id}
            style={[
              styles.optionChip,
              selectedProperty?.id === p.id && styles.optionChipActive,
            ]}
            onPress={() => setSelectedProperty(p)}
          >
            <Ionicons
              name="business-outline"
              size={14}
              color={selectedProperty?.id === p.id ? colors.white : colors.textSecondary}
            />
            <Text
              style={[
                styles.optionText,
                selectedProperty?.id === p.id && styles.optionTextActive,
              ]}
            >
              {p.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {selectedProperty && (
        <>
          <Text style={styles.label}>Select Bed * ({vacantBeds.length} vacant)</Text>
          <View style={styles.optionsRow}>
            {vacantBeds.map((bed) => (
              <TouchableOpacity
                key={bed.id}
                style={[
                  styles.bedOption,
                  selectedBed?.id === bed.id && styles.bedOptionActive,
                ]}
                onPress={() => {
                  setSelectedBed(bed);
                  if (!rentAmount) setRentAmount(String(bed.room.rentAmount));
                }}
              >
                <Text
                  style={[
                    styles.bedOptionRoom,
                    selectedBed?.id === bed.id && { color: colors.white },
                  ]}
                >
                  Room {bed.room.roomNumber}
                </Text>
                <Text
                  style={[
                    styles.bedOptionLabel,
                    selectedBed?.id === bed.id && { color: 'rgba(255,255,255,0.8)' },
                  ]}
                >
                  {bed.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Lease Terms</Text>

      <Text style={styles.label}>Monthly Rent (₹) *</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. 8000"
        value={rentAmount}
        onChangeText={setRentAmount}
        keyboardType="numeric"
        placeholderTextColor={colors.textLight}
      />

      <Text style={styles.label}>Billing Day (1-28)</Text>
      <TextInput
        style={styles.input}
        placeholder="Day of month rent is due"
        value={billingDay}
        onChangeText={setBillingDay}
        keyboardType="numeric"
        maxLength={2}
        placeholderTextColor={colors.textLight}
      />

      <Button
        title="Add Tenant"
        onPress={handleSubmit}
        loading={loading}
        size="lg"
        style={{ marginTop: 24 }}
      />
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
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
    marginTop: 12,
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
  bedOption: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    minWidth: 90,
  },
  bedOptionActive: {
    borderColor: colors.secondary,
    backgroundColor: colors.secondary,
  },
  bedOptionRoom: { fontSize: 13, fontWeight: '600', color: colors.text },
  bedOptionLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
});
