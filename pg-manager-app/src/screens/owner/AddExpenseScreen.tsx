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
import { Card } from '../../components/Card';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

const EXPENSE_CATEGORIES = [
  { key: 'maintenance', label: 'Maintenance', icon: 'construct-outline' },
  { key: 'utility', label: 'Utilities', icon: 'flash-outline' },
  { key: 'cleaning', label: 'Cleaning', icon: 'water-outline' },
  { key: 'repair', label: 'Repair', icon: 'build-outline' },
  { key: 'supplies', label: 'Supplies', icon: 'cube-outline' },
  { key: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' },
];

export function AddExpenseScreen({ navigation }: any) {
  const { user } = useAuth();
  const [properties, setProperties] = useState<any[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [category, setCategory] = useState('maintenance');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      api.properties.list(user.id).then((res) => setProperties(res.data));
    }
  }, [user]);

  const handleSubmit = async () => {
    if (!selectedProperty || !amount || !description) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      await api.expenses.create(user!.id, {
        propertyId: selectedProperty.id,
        category,
        amount: Number(amount),
        description,
        date: new Date().toISOString().split('T')[0],
      });
      Alert.alert('Success', 'Expense recorded successfully', [
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
      <Text style={styles.sectionTitle}>Select Property</Text>
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

      {selectedProperty && (
        <>
          <Text style={styles.label}>Category</Text>
          <View style={styles.categoriesGrid}>
            {EXPENSE_CATEGORIES.map((cat) => (
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
                    styles.categoryLabel,
                    category === cat.key && styles.categoryLabelActive,
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Expense Details</Text>

          <Text style={styles.label}>Amount (₹)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 500"
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholderTextColor={colors.textLight}
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="What was this expense for?"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            placeholderTextColor={colors.textLight}
          />

          <Button
            title="Add Expense"
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
  textArea: { minHeight: 80, paddingTop: 12 },
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
  categoriesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  categoryChip: {
    width: '30%',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  categoryChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  categoryLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  categoryLabelActive: { color: colors.white },
});