import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import { api } from '../../services/api';
import type { ShowcaseProperty } from '../../types';

export function PropertyShowcaseDetailScreen({ route }: any) {
  const { propertyId } = route.params;
  const [property, setProperty] = useState<ShowcaseProperty | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.properties
      .getPublic(propertyId)
      .then((res) => setProperty(res.data))
      .finally(() => setLoading(false));
  }, [propertyId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!property) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>Property not available</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {(property.imageUrls[0] && <Image source={{ uri: property.imageUrls[0] }} style={styles.hero} />) || <View style={styles.heroFallback} />}
      <Text style={styles.title}>{property.name}</Text>
      <Text style={styles.meta}>{property.city}{property.state ? `, ${property.state}` : ''}</Text>
      <Text style={styles.address}>{property.address}</Text>
      {!!property.availableFor && <Text style={styles.tag}>Available for: {property.availableFor}</Text>}

      {!!property.about && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.sectionBody}>{property.about}</Text>
        </View>
      )}

      {!!property.commonAmenitiesSummary && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Common Amenities</Text>
          <Text style={styles.sectionBody}>{property.commonAmenitiesSummary}</Text>
        </View>
      )}

      {!!property.serviceAmenitiesSummary && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Services</Text>
          <Text style={styles.sectionBody}>{property.serviceAmenitiesSummary}</Text>
        </View>
      )}

      {!!property.foodAmenitiesSummary && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Food</Text>
          <Text style={styles.sectionBody}>{property.foodAmenitiesSummary}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 24 },
  hero: { width: '100%', height: 220 },
  heroFallback: { width: '100%', height: 220, backgroundColor: '#E6ECF5' },
  title: { marginTop: 12, paddingHorizontal: 16, fontSize: 24, fontWeight: '800', color: colors.text },
  meta: { marginTop: 4, paddingHorizontal: 16, fontSize: 14, color: colors.textSecondary },
  address: { marginTop: 4, paddingHorizontal: 16, fontSize: 13, color: colors.textLight },
  tag: {
    marginTop: 8,
    marginHorizontal: 16,
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#EEF4FF',
    color: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 12,
    fontWeight: '700',
  },
  section: { marginTop: 16, marginHorizontal: 16, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  sectionBody: { marginTop: 6, fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { color: colors.textSecondary },
});
