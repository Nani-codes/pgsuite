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

export function AddDuesScreen({ navigation }: any) {
  const { user } = useAuth();
  const [tenants, setTenants] = useState<any[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [rentAmount, setRentAmount] = useState('');
  const [description, setDescription] = useState('Monthly Rent');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      api.billing.getTenants(user.id).then((res) => setTenants(res.data));
      api.properties.list(user.id).then((res) => setProperties(res.data));
    }
  }, [user]);

  useEffect(() => {
    if (selectedTenant && selectedTenant.leases?.length > 0) {
      setRentAmount(String(selectedTenant.leases[0].rentAmount));
    }
  }, [selectedTenant]);

  const handleSubmit = async () => {
    if (!selectedTenant || !selectedProperty || !rentAmount) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const dueDate = new Date(now.getFullYear(), now.getMonth() + 1, 5);

    setLoading(true);
    try {
      await api.billing.createInvoice(user!.id, {
        tenantId: selectedTenant.id,
        propertyId: selectedProperty.id,
        periodStart: periodStart.toISOString().split('T')[0],
        periodEnd: periodEnd.toISOString().split('T')[0],
        dueDate: dueDate.toISOString().split('T')[0],
        items: [{
          description,
          amount: Number(rentAmount),
        }],
      });
      Alert.alert('Success', 'Dues added successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Select Tenant</Text>
      <View style={styles.optionsRow}>
        {tenants.map((tenant) => (
          <TouchableOpacity
            key={tenant.id}
            style={[
              styles.optionChip,
              selectedTenant?.id === tenant.id && styles.optionChipActive,
            ]}
            onPress={() => setSelectedTenant(tenant)}
          >
            <Ionicons
              name="person-outline"
              size={14}
              color={selectedTenant?.id === tenant.id ? colors.white : colors.textSecondary}
            />
            <Text
              style={[
                styles.optionText,
                selectedTenant?.id === tenant.id && styles.optionTextActive,
              ]}
            >
              {tenant.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tenants.length === 0 && (
        <Text style={styles.emptyText}>No active tenants found</Text>
      )}

      {selectedTenant && (
        <>
          <Text style={styles.label}>Select Property</Text>
          <View style={styles.optionsRow}>
            {properties.map((prop) => (
              <TouchableOpacity
                key={prop.id}
                style={[
                  styles.optionChip,
                  selectedProperty?.id === prop.id && styles.optionChipActive,
                ]}
                onPress={() => setSelectedProperty(prop)}
              >
                <Ionicons
                  name="business-outline"
                  size={14}
                  color={selectedProperty?.id === prop.id ? colors.white : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.optionText,
                    selectedProperty?.id === prop.id && styles.optionTextActive,
                  ]}
                >
                  {prop.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {selectedProperty && (
        <>
          <Text style={styles.sectionTitle}>Invoice Details</Text>

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Monthly Rent"
            value={description}
            onChangeText={setDescription}
            placeholderTextColor={colors.textLight}
          />

          <Text style={styles.label}>Amount (₹)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 8000"
            value={rentAmount}
            onChangeText={setRentAmount}
            keyboardType="numeric"
            placeholderTextColor={colors.textLight}
          />

          <View style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
            <Text style={styles.infoText}>
              Invoice will be created for {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </Text>
          </View>

          <Button
            title="Add Dues"
            onPress={handleSubmit}
            loading={loading}
            size="lg"
            style={{ marginTop: 24 }}
          />
        </>
      )}
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
    marginTop: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
    marginTop: 16,
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
  emptyText: { fontSize: 14, color: colors.textSecondary, marginTop: 8 },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.primary + '10',
    padding: 14,
    borderRadius: 12,
    marginTop: 16,
  },
  infoText: { flex: 1, fontSize: 13, color: colors.textSecondary },
});