import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import type { Complaint } from '../../types';

const statusColors: Record<string, { bg: string; text: string }> = {
  open: { bg: '#FEE2E2', text: '#991B1B' },
  in_progress: { bg: '#FEF3C7', text: '#92400E' },
  resolved: { bg: '#D1FAE5', text: '#065F46' },
  closed: { bg: '#E2E8F0', text: '#475569' },
};

const categoryIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  plumbing: 'water-outline',
  electrical: 'flash-outline',
  wifi: 'wifi-outline',
  cleaning: 'sparkles-outline',
  furniture: 'bed-outline',
  security: 'shield-outline',
  other: 'help-circle-outline',
};

export function ComplaintsListScreen({ navigation }: any) {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.complaints.list(user.id, 'tenant');
      setComplaints(res.data);
    } catch {
      // tenant may not have complaints yet
    }
  }, [user]);

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

  const renderComplaint = ({ item }: { item: Complaint }) => {
    const sc = statusColors[item.status] || statusColors.open;
    const icon = categoryIcons[item.category] || 'help-circle-outline';

    return (
      <Card style={styles.complaintCard}>
        <View style={styles.complaintHeader}>
          <View style={[styles.iconBg, { backgroundColor: sc.bg }]}>
            <Ionicons name={icon} size={20} color={sc.text} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.complaintTitle}>{item.title}</Text>
            <Text style={styles.categoryText}>{item.category}</Text>
          </View>
          <Badge
            label={item.status.replace('_', ' ')}
            color={sc.bg}
            textColor={sc.text}
          />
        </View>
        <Text style={styles.description} numberOfLines={2}>
          {item.description}
        </Text>
        <Text style={styles.timeText}>
          {new Date(item.createdAt).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </Text>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={complaints}
        renderItem={renderComplaint}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>My Complaints</Text>
            <Button
              title="+ Raise New"
              onPress={() => navigation.navigate('RaiseComplaint')}
              size="sm"
              style={{ paddingHorizontal: 14 }}
            />
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="chatbubble-ellipses-outline"
            title="No complaints"
            subtitle="Everything good? If not, raise a complaint and we'll get it resolved."
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
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  complaintCard: { marginBottom: 12 },
  complaintHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  complaintTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  categoryText: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  description: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 10,
    lineHeight: 18,
  },
  timeText: {
    fontSize: 11,
    color: colors.textLight,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
});
