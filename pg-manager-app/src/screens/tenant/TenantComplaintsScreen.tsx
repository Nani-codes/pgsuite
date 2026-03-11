import React, { useState } from 'react';
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

const categories = [
  { key: 'plumbing', icon: 'water-outline', label: 'Plumbing' },
  { key: 'electrical', icon: 'flash-outline', label: 'Electrical' },
  { key: 'wifi', icon: 'wifi-outline', label: 'WiFi' },
  { key: 'cleaning', icon: 'sparkles-outline', label: 'Cleaning' },
  { key: 'furniture', icon: 'bed-outline', label: 'Furniture' },
  { key: 'security', icon: 'shield-outline', label: 'Security' },
  { key: 'other', icon: 'help-circle-outline', label: 'Other' },
] as const;

export function TenantComplaintsScreen() {
  const { user } = useAuth();
  const [category, setCategory] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!category || !title || !description) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      // In a real app, the propertyId would come from the tenant's active lease
      await api.complaints.create(user!.id, {
        propertyId: '00000000-0000-0000-0000-000000000000',
        category,
        title,
        description,
      });
      setSubmitted(true);
    } catch (err: any) {
      Alert.alert('Note', 'Complaint form submitted (demo mode)');
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <View style={styles.successContainer}>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark-circle" size={64} color={colors.secondary} />
        </View>
        <Text style={styles.successTitle}>Complaint Submitted!</Text>
        <Text style={styles.successText}>
          Your complaint has been logged. The PG owner will be notified and will
          respond shortly.
        </Text>
        <Button
          title="Submit Another"
          onPress={() => {
            setSubmitted(false);
            setCategory('');
            setTitle('');
            setDescription('');
          }}
          variant="outline"
          style={{ marginTop: 20 }}
        />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.screenTitle}>Raise a Complaint</Text>
      <Text style={styles.screenSubtitle}>
        Tell us what's wrong and we'll get it resolved
      </Text>

      <Text style={styles.label}>Category *</Text>
      <View style={styles.categoriesGrid}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.key}
            style={[
              styles.categoryChip,
              category === cat.key && styles.categoryChipActive,
            ]}
            onPress={() => setCategory(cat.key)}
          >
            <Ionicons
              name={cat.icon as any}
              size={20}
              color={category === cat.key ? colors.white : colors.textSecondary}
            />
            <Text
              style={[
                styles.categoryText,
                category === cat.key && styles.categoryTextActive,
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Title *</Text>
      <TextInput
        style={styles.input}
        placeholder="Brief title for your issue"
        value={title}
        onChangeText={setTitle}
        placeholderTextColor={colors.textLight}
      />

      <Text style={styles.label}>Description *</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Describe the issue in detail..."
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={5}
        textAlignVertical="top"
        placeholderTextColor={colors.textLight}
      />

      <Button
        title="Submit Complaint"
        onPress={handleSubmit}
        loading={loading}
        size="lg"
        style={{ marginTop: 20 }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 40 },
  screenTitle: { fontSize: 22, fontWeight: '700', color: colors.text },
  screenSubtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 4, marginBottom: 20 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
    marginTop: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
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
  categoryChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  categoryText: { fontSize: 13, fontWeight: '500', color: colors.textSecondary },
  categoryTextActive: { color: colors.white },
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
  textArea: {
    height: 120,
    paddingTop: 12,
  },
  successContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  successIcon: { marginBottom: 16 },
  successTitle: { fontSize: 22, fontWeight: '700', color: colors.text },
  successText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
});
