import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { colors } from '../../theme/colors';
import { Button } from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import type { Tenant } from '../../types';

export function EditTenantScreen({ route, navigation }: any) {
  const { user } = useAuth();
  const { tenantId } = route.params;
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      api.tenants.get(tenantId, user.id).then((res) => {
        const t = res.data;
        setTenant(t);
        setName(t.name);
        setPhone(t.phone);
        setEmail(t.email || '');
        setEmergencyName(t.emergencyContactName || '');
        setEmergencyPhone(t.emergencyContactPhone || '');
      });
    }
  }, [tenantId, user]);

  const handleSave = async () => {
    if (!name.trim() || !phone.trim()) {
      Alert.alert('Error', 'Name and phone are required');
      return;
    }
    setSaving(true);
    try {
      await api.tenants.update(tenantId, user!.id, {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        emergencyContactName: emergencyName.trim() || undefined,
        emergencyContactPhone: emergencyPhone.trim() || undefined,
      });
      Alert.alert('Success', 'Tenant updated', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!tenant) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Personal Details</Text>

      <Text style={styles.label}>FULL NAME *</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Full name"
        placeholderTextColor={colors.textLight}
      />

      <Text style={styles.label}>PHONE *</Text>
      <TextInput
        style={styles.input}
        value={phone}
        onChangeText={setPhone}
        placeholder="10-digit phone"
        keyboardType="phone-pad"
        maxLength={10}
        placeholderTextColor={colors.textLight}
      />

      <Text style={styles.label}>EMAIL</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="email@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        placeholderTextColor={colors.textLight}
      />

      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
        Emergency Contact
      </Text>

      <Text style={styles.label}>CONTACT NAME</Text>
      <TextInput
        style={styles.input}
        value={emergencyName}
        onChangeText={setEmergencyName}
        placeholder="Emergency contact name"
        placeholderTextColor={colors.textLight}
      />

      <Text style={styles.label}>CONTACT PHONE</Text>
      <TextInput
        style={styles.input}
        value={emergencyPhone}
        onChangeText={setEmergencyPhone}
        placeholder="Emergency contact phone"
        keyboardType="phone-pad"
        placeholderTextColor={colors.textLight}
      />

      <Button
        title="Save Changes"
        onPress={handleSave}
        loading={saving}
        disabled={!name.trim() || !phone.trim()}
        size="lg"
        style={{ marginTop: 24 }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 40 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: colors.textSecondary },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
    marginTop: 12,
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
});
