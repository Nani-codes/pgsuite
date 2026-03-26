import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { colors, shadows } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import type { Complaint } from '../../types';

const priorityFromCategory: Record<string, 'high' | 'medium' | 'low'> = {
  plumbing: 'high',
  electrical: 'high',
  security: 'high',
  wifi: 'medium',
  furniture: 'medium',
  cleaning: 'low',
  other: 'low',
};

const priorityStyles: Record<string, { bg: string; text: string; label: string }> = {
  high: { bg: colors.errorContainer, text: colors.onErrorContainer, label: 'High Priority' },
  medium: { bg: '#FEF3C7', text: '#92400E', label: 'Medium Priority' },
  low: { bg: colors.surfaceContainerHighest, text: colors.textSecondary, label: 'Low Priority' },
};

const STATUS_TRANSITIONS: Record<string, string[]> = {
  open: ['in_progress', 'resolved', 'closed'],
  in_progress: ['resolved', 'closed'],
  resolved: ['closed'],
  closed: [],
};

export function ComplaintsScreen() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    if (!user) return;
    try {
      const res = await api.complaints.list(user.id, user.role);
      setComplaints(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleStatusUpdate = (complaint: Complaint) => {
    const nextStatuses = STATUS_TRANSITIONS[complaint.status] || [];
    if (nextStatuses.length === 0) return;

    const buttons = nextStatuses.map((status) => ({
      text: status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      onPress: async () => {
        try {
          await api.complaints.updateStatus(complaint.id, user!.id, status);
          await loadData();
        } catch (err: any) {
          Alert.alert('Error', err.message || 'Failed to update status');
        }
      },
    }));

    Alert.alert(
      'Update Status',
      `Change "${complaint.title}" status from "${complaint.status.replace('_', ' ')}" to:`,
      [...buttons, { text: 'Cancel', style: 'cancel' as const, onPress: () => {} }],
    );
  };

  const stats = useMemo(() => {
    const active = complaints.filter((c) => c.status !== 'closed' && c.status !== 'resolved').length;
    const urgent = complaints.filter((c) => {
      const p = priorityFromCategory[c.category] || 'low';
      return p === 'high' && c.status !== 'closed' && c.status !== 'resolved';
    }).length;
    const resolved = complaints.filter((c) => c.status === 'resolved' || c.status === 'closed').length;
    return { active, urgent, resolved };
  }, [complaints]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return complaints;
    const q = searchQuery.toLowerCase();
    return complaints.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.tenant?.name?.toLowerCase().includes(q),
    );
  }, [complaints, searchQuery]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return 'radio-button-off-outline';
      case 'in_progress':
        return 'time-outline';
      case 'resolved':
        return 'checkmark-circle';
      case 'closed':
        return 'checkmark-circle';
      default:
        return 'help-circle-outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return colors.text;
      case 'in_progress':
        return colors.secondary;
      case 'resolved':
        return colors.primary;
      case 'closed':
        return colors.textLight;
      default:
        return colors.textLight;
    }
  };

  const renderComplaint = ({ item, index }: { item: Complaint; index: number }) => {
    const priority = priorityFromCategory[item.category] || 'low';
    const ps = priorityStyles[priority];
    const isResolved = item.status === 'resolved' || item.status === 'closed';
    const canUpdate =
      (STATUS_TRANSITIONS[item.status] || []).length > 0 && user?.role === 'owner';

    return (
      <Animated.View entering={FadeInUp.delay(index * 60).springify()}>
        <View
          style={[
            styles.requestCard,
            isResolved && styles.requestCardResolved,
          ]}
        >
          <View style={styles.cardTopRow}>
            <View style={{ flex: 1, gap: 4 }}>
              {item.tenant && (
                <View style={styles.roomBadge}>
                  <Text style={styles.roomBadgeText}>
                    {item.tenant.name}
                  </Text>
                </View>
              )}
              <Text
                style={[
                  styles.requestTitle,
                  isResolved && styles.requestTitleResolved,
                ]}
              >
                {item.title}
              </Text>
            </View>
            <View style={[styles.priorityBadge, { backgroundColor: ps.bg }]}>
              <Text style={[styles.priorityText, { color: ps.text }]}>
                {ps.label}
              </Text>
            </View>
          </View>

          <Text style={styles.requestDescription} numberOfLines={2}>
            {item.description}
          </Text>

          <View style={styles.cardFooter}>
            <View style={styles.statusRow}>
              <Ionicons
                name={getStatusIcon(item.status) as any}
                size={18}
                color={getStatusColor(item.status)}
              />
              <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                {item.status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </Text>
            </View>
            <View style={styles.cardActions}>
              {canUpdate && (
                <TouchableOpacity
                  style={styles.updateBtn}
                  onPress={() => handleStatusUpdate(item)}
                >
                  <Text style={styles.updateBtnText}>Update Status</Text>
                </TouchableOpacity>
              )}
              {isResolved && (
                <Text style={styles.viewDetailsText}>Closed</Text>
              )}
            </View>
          </View>
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={filtered}
        renderItem={renderComplaint}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <View>
            <Animated.View entering={FadeInDown.springify()}>
              <Text style={styles.title}>Maintenance Requests</Text>
              <Text style={styles.subtitle}>
                Manage reported issues and coordinate repairs.
              </Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>ACTIVE ISSUES</Text>
                <View style={styles.statValueRow}>
                  <Text style={[styles.statValue, { color: colors.indigo900 }]}>
                    {String(stats.active).padStart(2, '0')}
                  </Text>
                </View>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.secondaryContainer }]}>
                <Text style={[styles.statLabel, { color: colors.onSecondaryContainer }]}>
                  URGENT ACTIONS
                </Text>
                <View style={styles.statValueRow}>
                  <Text style={[styles.statValue, { color: colors.onSecondaryContainer }]}>
                    {String(stats.urgent).padStart(2, '0')}
                  </Text>
                  <Text style={[styles.statSubtext, { color: colors.onSecondaryContainer }]}>
                    High Priority
                  </Text>
                </View>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.primary }]}>
                <Text style={[styles.statLabel, { color: 'rgba(255,255,255,0.8)' }]}>
                  RESOLVED
                </Text>
                <View style={styles.statValueRow}>
                  <Text style={[styles.statValue, { color: colors.white }]}>
                    {String(stats.resolved).padStart(2, '0')}
                  </Text>
                </View>
              </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.searchRow}>
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color={colors.textLight} style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by issue or tenant..."
                  placeholderTextColor={colors.textLight}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={18} color={colors.textLight} />
                  </TouchableOpacity>
                )}
              </View>
            </Animated.View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle-outline" size={48} color={colors.textLight} />
            <Text style={styles.emptyTitle}>No requests found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery ? 'Try a different search term' : 'All quiet! No maintenance requests.'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: 20, paddingBottom: 32 },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.indigo900,
    letterSpacing: -0.5,
    marginBottom: 4,
    marginTop: 16,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    minHeight: 110,
    justifyContent: 'space-between',
    ...shadows.sm,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 1.5,
  },
  statValueRow: {
    marginTop: 8,
  },
  statValue: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1,
  },
  statSubtext: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  searchRow: {
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: colors.text,
  },
  requestCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    ...shadows.sm,
  },
  requestCardResolved: {
    backgroundColor: colors.surfaceAlt,
    opacity: 0.75,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.outlineVariant,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  roomBadge: {
    backgroundColor: colors.indigo50,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  roomBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.indigo900,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  requestTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  requestTitleResolved: {
    textDecorationLine: 'line-through',
    color: colors.textSecondary,
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginLeft: 8,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  requestDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainer,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  updateBtn: {
    backgroundColor: colors.indigo900,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  updateBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
  },
  viewDetailsText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textLight,
    textTransform: 'uppercase',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
