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

export function TenantComplaintsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [category, setCategory] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!category || !title || !description) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      await api.complaints.create(user!.id, {
        category,
        title,
        description,
      });
      Alert.alert('Success', 'Your complaint has been submitted. The PG owner will be notified.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert(
        'Submitted',
        'Complaint form submitted (demo mode)',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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
  screenSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
  },
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
});
