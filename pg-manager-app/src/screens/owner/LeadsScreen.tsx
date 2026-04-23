import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { EmptyState } from '../../components/EmptyState';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import type { Lead } from '../../types';

const statusColors: Record<string, { bg: string; text: string }> = {
  new_lead: { bg: '#DBEAFE', text: '#1E40AF' },
  contacted: { bg: '#E0E7FF', text: '#312E81' },
  interested: { bg: '#D1FAE5', text: '#065F46' },
  visit_scheduled: { bg: '#FEF3C7', text: '#92400E' },
  visit_done: { bg: '#FDE68A', text: '#78350F' },
  converted: { bg: '#D1FAE5', text: '#065F46' },
  lost: { bg: '#FEE2E2', text: '#991B1B' },
};

const sourceIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  walk_in: 'walk-outline',
  online: 'globe-outline',
  referral: 'people-outline',
  social_media: 'logo-instagram',
  other: 'ellipsis-horizontal',
};

const statusLabels: Record<string, string> = {
  new_lead: 'New',
  contacted: 'Contacted',
  interested: 'Interested',
  visit_scheduled: 'Visit Scheduled',
  visit_done: 'Visit Done',
  converted: 'Converted',
  lost: 'Lost',
};

export function LeadsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filter, setFilter] = useState<string | undefined>(undefined);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.leads.list(user.id, filter);
      setLeads(res.data);
    } catch (err) {
      console.error(err);
    }
  }, [user, filter]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const filters = [
    { label: 'All', value: undefined },
    { label: 'New', value: 'new_lead' },
    { label: 'Interested', value: 'interested' },
    { label: 'Visit', value: 'visit_scheduled' },
    { label: 'Converted', value: 'converted' },
  ];

  const renderLead = ({ item }: { item: Lead }) => {
    const sc = statusColors[item.status] || statusColors.new_lead;
    const sourceIcon = sourceIcons[item.source] || 'ellipsis-horizontal';

    return (
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <Ionicons name="person-add-outline" size={20} color={colors.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item.name}</Text>
            <View style={styles.sourceRow}>
              <Ionicons name={sourceIcon} size={12} color={colors.textLight} />
              <Text style={styles.sourceText}>{item.source.replace('_', ' ')}</Text>
            </View>
          </View>
          <Badge label={statusLabels[item.status] || item.status} color={sc.bg} textColor={sc.text} />
        </View>

        <View style={styles.details}>
          <View style={styles.detailRow}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => Linking.openURL(`tel:${item.phone}`)}
            >
              <Ionicons name="call" size={16} color={colors.primary} />
              <Text style={styles.actionText}>{item.phone}</Text>
            </TouchableOpacity>
            {item.email && (
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => Linking.openURL(`mailto:${item.email}`)}
              >
                <Ionicons name="mail" size={16} color={colors.primary} />
                <Text style={styles.actionText}>Email</Text>
              </TouchableOpacity>
            )}
          </View>

          {item.property && (
            <View style={styles.infoRow}>
              <Ionicons name="business-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.infoText}>Interested in: {item.property.name}</Text>
            </View>
          )}

          {item.budget && (
            <View style={styles.infoRow}>
              <Ionicons name="cash-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.infoText}>Budget: ₹{Number(item.budget).toLocaleString()}</Text>
            </View>
          )}

          {item.followUpDate && (
            <View style={styles.infoRow}>
              <Ionicons name="alarm-outline" size={14} color={colors.warning} />
              <Text style={[styles.infoText, { color: colors.warning }]}>
                Follow-up: {new Date(item.followUpDate).toLocaleDateString('en-IN')}
              </Text>
            </View>
          )}

          {item.notes && (
            <Text style={styles.notes} numberOfLines={2}>{item.notes}</Text>
          )}
        </View>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={leads}
        renderItem={renderLead}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <Text style={styles.title}>Leads</Text>
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => navigation.navigate('AddLead')}
              >
                <Ionicons name="add" size={20} color={colors.white} />
                <Text style={styles.addBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.filterRow}>
              {filters.map((f) => (
                <TouchableOpacity
                  key={f.label}
                  style={[styles.filterChip, filter === f.value && styles.filterChipActive]}
                  onPress={() => setFilter(f.value)}
                >
                  <Text
                    style={[styles.filterText, filter === f.value && styles.filterTextActive]}
                  >
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="person-add-outline"
            title="No leads yet"
            subtitle="Add leads from inquiries and walk-ins"
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: 16, paddingBottom: 32 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  addBtnText: { color: colors.white, fontWeight: '600', fontSize: 14 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.surfaceAlt,
  },
  filterChipActive: { backgroundColor: colors.primary },
  filterText: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  filterTextActive: { color: colors.white },
  card: { marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontSize: 16, fontWeight: '600', color: colors.text },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  sourceText: { fontSize: 12, color: colors.textLight, textTransform: 'capitalize' },
  details: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  detailRow: { flexDirection: 'row', gap: 16, marginBottom: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { fontSize: 13, color: colors.primary, fontWeight: '500' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  infoText: { fontSize: 13, color: colors.textSecondary },
  notes: {
    fontSize: 13,
    color: colors.textLight,
    fontStyle: 'italic',
    marginTop: 6,
  },
});
