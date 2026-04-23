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

const AMENITY_OPTIONS = [
  'wifi',
  'ac',
  'washing machine',
  'geyser',
  'parking',
  'power backup',
  'cctv',
  'security',
  'kitchen',
  'fridge',
  'microwave',
  'balcony',
  'garden',
  'lift',
];

export function AddPropertyScreen({ navigation }: any) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [availableFor, setAvailableFor] = useState('');
  const [about, setAbout] = useState('');
  const [imageUrlsInput, setImageUrlsInput] = useState('');
  const [listPublicly, setListPublicly] = useState(false);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenity)
        ? prev.filter((a) => a !== amenity)
        : [...prev, amenity],
    );
  };

  const handleSubmit = async () => {
    if (!name || !address || !city) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    setLoading(true);
    try {
      const imageUrls = imageUrlsInput
        .split('\n')
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);

      await api.properties.create(user!.id, {
        name,
        address,
        city,
        state: state || undefined,
        pincode: pincode || undefined,
        availableFor: availableFor || undefined,
        about: about || undefined,
        imageUrls,
        listPublicly,
        amenities: selectedAmenities,
      });
      Alert.alert('Success', 'Property has been added', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.sectionTitle}>Property Details</Text>

      <Text style={styles.label}>Property Name *</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Sunrise PG"
        value={name}
        onChangeText={setName}
        placeholderTextColor={colors.textLight}
      />

      <Text style={styles.label}>Address *</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Full address"
        value={address}
        onChangeText={setAddress}
        multiline
        numberOfLines={3}
        textAlignVertical="top"
        placeholderTextColor={colors.textLight}
      />

      <Text style={styles.label}>City *</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Bangalore"
        value={city}
        onChangeText={setCity}
        placeholderTextColor={colors.textLight}
      />

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>State</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Karnataka"
            value={state}
            onChangeText={setState}
            placeholderTextColor={colors.textLight}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Pincode</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 560001"
            value={pincode}
            onChangeText={setPincode}
            placeholderTextColor={colors.textLight}
            keyboardType="number-pad"
          />
        </View>
      </View>

      <Text style={styles.label}>Available For</Text>
      <TextInput
        style={styles.input}
        placeholder="Any / Boys / Girls"
        value={availableFor}
        onChangeText={setAvailableFor}
        placeholderTextColor={colors.textLight}
      />

      <Text style={styles.label}>About Property</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Short description of your property"
        value={about}
        onChangeText={setAbout}
        placeholderTextColor={colors.textLight}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />

      <Text style={styles.label}>Image URLs (one per line)</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="https://...image1.jpg"
        value={imageUrlsInput}
        onChangeText={setImageUrlsInput}
        placeholderTextColor={colors.textLight}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />

      <TouchableOpacity
        style={[styles.listToggle, listPublicly && styles.listToggleActive]}
        onPress={() => setListPublicly((prev) => !prev)}
      >
        <Ionicons
          name={listPublicly ? 'checkmark-circle' : 'ellipse-outline'}
          size={20}
          color={listPublicly ? colors.primary : colors.textSecondary}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.listToggleTitle}>List this property publicly</Text>
          <Text style={styles.listToggleSubtitle}>
            If enabled, guests can discover this property in public browse.
          </Text>
        </View>
      </TouchableOpacity>

      <Text style={[styles.label, { marginTop: 20 }]}>Amenities</Text>
      <View style={styles.amenitiesGrid}>
        {AMENITY_OPTIONS.map((amenity) => (
          <TouchableOpacity
            key={amenity}
            style={[
              styles.amenityChip,
              selectedAmenities.includes(amenity) &&
                styles.amenityChipActive,
            ]}
            onPress={() => toggleAmenity(amenity)}
          >
            <Ionicons
              name={
                selectedAmenities.includes(amenity)
                  ? 'checkmark-circle'
                  : 'ellipse-outline'
              }
              size={18}
              color={
                selectedAmenities.includes(amenity)
                  ? colors.white
                  : colors.textSecondary
              }
            />
            <Text
              style={[
                styles.amenityText,
                selectedAmenities.includes(amenity) &&
                  styles.amenityTextActive,
              ]}
            >
              {amenity}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Button
        title="Add Property"
        onPress={handleSubmit}
        loading={loading}
        disabled={!name || !address || !city}
        size="lg"
        style={{ marginTop: 32 }}
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
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  amenityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  amenityChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  amenityText: {
    fontSize: 13,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  amenityTextActive: { color: colors.white },
  listToggle: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  listToggleActive: {
    borderColor: colors.primary,
    backgroundColor: '#EEF4FF',
  },
  listToggleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  listToggleSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: colors.textSecondary,
  },
});
