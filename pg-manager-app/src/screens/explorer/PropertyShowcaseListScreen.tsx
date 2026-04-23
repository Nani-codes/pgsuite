import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import { colors } from '../../theme/colors';
import { api } from '../../services/api';
import type { ShowcaseProperty } from '../../types';
import { useAuth } from '../../context/AuthContext';

const PAGE_SIZE = 20;

export function PropertyShowcaseListScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const [items, setItems] = useState<ShowcaseProperty[]>([]);
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [availableFor, setAvailableFor] = useState<'boys' | 'girls' | 'any' | undefined>(undefined);
  const [hasImages, setHasImages] = useState(false);
  const [hasAbout, setHasAbout] = useState(false);
  const [lat, setLat] = useState<number | undefined>(undefined);
  const [lng, setLng] = useState<number | undefined>(undefined);
  const [radiusKm, setRadiusKm] = useState<number>(5);
  const [locating, setLocating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const fetchProperties = useCallback(async (mode: 'reset' | 'append') => {
    if (mode === 'append' && (loadingMore || !hasMore)) return;

    const nextOffset = mode === 'append' ? offset : 0;
    if (mode === 'append') setLoadingMore(true);
    try {
      const res = await api.properties.listPublic({
        q: query.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        pincode: pincode.trim() || undefined,
        availableFor,
        hasImages,
        hasAbout,
        lat,
        lng,
        radiusKm: lat !== undefined && lng !== undefined ? radiusKm : undefined,
        sort: lat !== undefined && lng !== undefined ? 'distance' : 'updated',
        limit: PAGE_SIZE,
        offset: nextOffset,
      });

      const fetched = res.data.items;
      setItems((prev) => (mode === 'append' ? [...prev, ...fetched] : fetched));
      setTotal(res.data.total);
      setOffset(nextOffset + fetched.length);
      setHasMore(nextOffset + fetched.length < res.data.total);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [availableFor, city, hasAbout, hasImages, hasMore, lat, lng, loadingMore, offset, pincode, query, radiusKm, state]);

  useEffect(() => {
    setLoading(true);
    setOffset(0);
    setHasMore(true);
    fetchProperties('reset');
  }, [query, city, state, pincode, availableFor, hasImages, hasAbout, lat, lng, radiusKm, fetchProperties]);

  const enableNearMe = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Unavailable', 'Location-based filtering is available on native app builds.');
      return;
    }
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Location permission is needed for near-by filters.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLat(position.coords.latitude);
      setLng(position.coords.longitude);
    } catch {
      Alert.alert('Location Error', 'Could not fetch your location.');
    } finally {
      setLocating(false);
    }
  };

  const disableNearMe = () => {
    setLat(undefined);
    setLng(undefined);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Explore Properties</Text>
          <Text style={styles.subtitle}>Browse available PGs before joining</Text>
        </View>
        {user ? (
          <TouchableOpacity onPress={logout}>
            <Text style={styles.logout}>Logout</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => navigation.getParent()?.navigate('Login')}>
            <Text style={styles.logout}>Login / Signup</Text>
          </TouchableOpacity>
        )}
      </View>

      <TextInput
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={() => fetchProperties('reset')}
        placeholder="Search by property or city"
        style={styles.search}
        placeholderTextColor={colors.textLight}
      />
      <View style={styles.filtersRow}>
        <TextInput
          value={city}
          onChangeText={setCity}
          placeholder="City"
          style={styles.filterInput}
          placeholderTextColor={colors.textLight}
        />
        <TextInput
          value={state}
          onChangeText={setState}
          placeholder="State"
          style={styles.filterInput}
          placeholderTextColor={colors.textLight}
        />
        <TextInput
          value={pincode}
          onChangeText={setPincode}
          placeholder="Pincode"
          style={styles.filterInput}
          placeholderTextColor={colors.textLight}
          keyboardType="number-pad"
        />
      </View>
      <View style={styles.chipsRow}>
        {([
          { label: 'Any', value: undefined as undefined | 'boys' | 'girls' | 'any' },
          { label: 'Boys', value: 'boys' as const },
          { label: 'Girls', value: 'girls' as const },
          { label: 'All', value: 'any' as const },
        ]).map((opt) => (
          <TouchableOpacity
            key={opt.label}
            onPress={() => setAvailableFor(opt.value)}
            style={[styles.chip, availableFor === opt.value && styles.chipActive]}
          >
            <Text style={[styles.chipText, availableFor === opt.value && styles.chipTextActive]}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          onPress={() => setHasImages((prev) => !prev)}
          style={[styles.chip, hasImages && styles.chipActive]}
        >
          <Text style={[styles.chipText, hasImages && styles.chipTextActive]}>With Images</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setHasAbout((prev) => !prev)}
          style={[styles.chip, hasAbout && styles.chipActive]}
        >
          <Text style={[styles.chipText, hasAbout && styles.chipTextActive]}>With Description</Text>
        </TouchableOpacity>
        {lat !== undefined && lng !== undefined ? (
          <TouchableOpacity onPress={disableNearMe} style={[styles.chip, styles.chipActive]}>
            <Text style={[styles.chipText, styles.chipTextActive]}>Near me ON</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={enableNearMe} style={styles.chip}>
            <Text style={styles.chipText}>{locating ? 'Locating...' : 'Use Current Location'}</Text>
          </TouchableOpacity>
        )}
      </View>
      {lat !== undefined && lng !== undefined ? (
        <View style={styles.chipsRow}>
          {[1, 3, 5, 10].map((radius) => (
            <TouchableOpacity
              key={radius}
              onPress={() => setRadiusKm(radius)}
              style={[styles.chip, radiusKm === radius && styles.chipActive]}
            >
              <Text style={[styles.chipText, radiusKm === radius && styles.chipTextActive]}>{radius} km</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchProperties('reset');
              }}
            />
          }
          onEndReachedThreshold={0.5}
          onEndReached={() => fetchProperties('append')}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.empty}>No properties found</Text>
            </View>
          }
          renderItem={({ item }) => {
            const image = item.imageUrls[0];
            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate('PropertyShowcaseDetail', { propertyId: item.id })}
              >
                {image ? <Image source={{ uri: image }} style={styles.image} /> : <View style={styles.imageFallback} />}
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <Text style={styles.cardMeta}>{item.city}{item.state ? `, ${item.state}` : ''}</Text>
                  <Text numberOfLines={2} style={styles.cardAddress}>{item.address}</Text>
                  {typeof item.distanceKm === 'number' ? (
                    <Text style={styles.distanceBadge}>
                      {item.distanceKm.toFixed(1)} km away
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
      {!loading && items.length > 0 ? (
        <Text style={styles.resultMeta}>
          Showing {items.length} of {total} properties
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingTop: 56, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  logout: { color: colors.primary, fontWeight: '700' },
  search: {
    marginTop: 12,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
  },
  filtersRow: {
    marginTop: 8,
    marginHorizontal: 16,
    flexDirection: 'row',
    gap: 8,
  },
  filterInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.text,
  },
  chipsRow: {
    marginTop: 8,
    marginHorizontal: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.surface,
  },
  chipActive: {
    backgroundColor: '#EEF4FF',
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  chipTextActive: {
    color: colors.primary,
  },
  list: { padding: 16, gap: 12, paddingBottom: 24 },
  card: { borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  image: { width: '100%', height: 150 },
  imageFallback: { width: '100%', height: 150, backgroundColor: '#E6ECF5' },
  cardBody: { padding: 12 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  cardMeta: { marginTop: 4, fontSize: 13, color: colors.textSecondary },
  cardAddress: { marginTop: 4, fontSize: 12, color: colors.textLight },
  distanceBadge: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#EEF4FF',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 11,
    color: colors.primary,
    fontWeight: '700',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  empty: { color: colors.textSecondary, fontSize: 14 },
  footerLoader: { paddingVertical: 16 },
  resultMeta: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    fontSize: 12,
    color: colors.textLight,
  },
});
