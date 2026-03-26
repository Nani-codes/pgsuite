import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { colors, shadows } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import type { DashboardData, Property } from '../../types';

export function DashboardScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    if (!user) return;
    setError(null);
    try {
      const [dash, props] = await Promise.all([
        api.analytics.dashboard(user.id),
        api.properties.list(user.id),
      ]);
      setDashboard(dash.data);
      setProperties(props.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
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

  const occ = dashboard?.occupancy || { total: 0, occupied: 0, vacant: 0 };
  const occupancyRate = occ.total
    ? Math.round((occ.occupied / occ.total) * 100)
    : 0;

  const recentLogs = [
    {
      icon: 'checkmark-circle' as const,
      iconBg: colors.surfaceContainerHighest,
      iconColor: colors.primary,
      title: 'Payment Received',
      subtitle: `Today's collection: ₹${dashboard?.todayCollection?.toLocaleString?.() || '0'}`,
      time: 'Today',
    },
    {
      icon: 'warning' as const,
      iconBg: colors.errorContainer,
      iconColor: colors.error,
      title: 'Open Complaints',
      subtitle: `${dashboard?.openComplaints || 0} complaints need attention`,
      time: 'Active',
    },
    {
      icon: 'business' as const,
      iconBg: colors.primaryLight,
      iconColor: colors.primary,
      title: 'Properties',
      subtitle: `${dashboard?.totalProperties || 0} properties managed`,
      time: 'Total',
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Overview</Text>
            <Text style={styles.headerSubtitle}>
              Welcome back, monitoring your properties today.
            </Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.avatarBtn}>
            <Ionicons name="log-out-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={loadData}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Bento Grid Stats */}
      <View style={styles.section}>
        {/* Occupancy Card — full width */}
        <Animated.View entering={FadeInUp.delay(100).duration(500)}>
          <View style={styles.occupancyCard}>
            <View style={styles.occupancyTop}>
              <Text style={styles.bentoLabel}>OCCUPANCY RATE</Text>
              <View style={styles.bentoIconWrap}>
                <Ionicons name="bed-outline" size={20} color={colors.primary} />
              </View>
            </View>
            <View style={styles.occupancyValueRow}>
              <Text style={styles.occupancyPercent}>{occupancyRate}%</Text>
              <Text style={styles.occupancyCapacity}>Capacity</Text>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[styles.progressFill, { width: `${occupancyRate}%` }]}
              />
            </View>
            <View style={styles.occupancyFooter}>
              <Text style={styles.occupiedText}>{occ.occupied} Occupied</Text>
              <Text style={styles.vacantText}>{occ.vacant} Empty Beds</Text>
            </View>
          </View>
        </Animated.View>

        {/* Pending Payments + Maintenance row */}
        <Animated.View
          entering={FadeInUp.delay(200).duration(500)}
          style={styles.bentoRow}
        >
          {/* Pending Payments */}
          <View style={styles.pendingCard}>
            <View style={styles.pendingContent}>
              <Text style={styles.pendingLabel}>PENDING PAYMENTS</Text>
              <Text style={styles.pendingAmount}>
                ₹{dashboard?.totalDues?.toLocaleString?.() || '0'}
              </Text>
              <Text style={styles.pendingSubtext}>
                Outstanding dues
              </Text>
            </View>
            <TouchableOpacity
              style={styles.reviewBtn}
              onPress={() => navigation.navigate('RecordPayment')}
            >
              <Text style={styles.reviewBtnText}>Review</Text>
              <Ionicons name="arrow-forward" size={14} color={colors.white} />
            </TouchableOpacity>
            <View style={styles.pendingWatermark}>
              <Ionicons name="card-outline" size={72} color={colors.onSecondaryContainer} />
            </View>
          </View>

          {/* Maintenance */}
          <View style={styles.maintenanceCard}>
            <View style={styles.maintenanceTop}>
              <Text style={styles.maintenanceLabel}>MAINTENANCE</Text>
              <View style={styles.maintenanceIconWrap}>
                <Ionicons
                  name="construct-outline"
                  size={18}
                  color={colors.textLight}
                />
              </View>
            </View>
            <View style={styles.maintenanceValueRow}>
              <Text style={styles.maintenanceCount}>
                {String(dashboard?.openComplaints || 0).padStart(2, '0')}
              </Text>
              <Text style={styles.maintenanceActive}>Active</Text>
            </View>
            <View style={styles.maintenanceItems}>
              <View style={styles.maintenanceItem}>
                <View style={[styles.dot, { backgroundColor: colors.error }]} />
                <Text style={styles.maintenanceItemText} numberOfLines={1}>
                  Open complaints
                </Text>
              </View>
              <View style={[styles.maintenanceItem, { opacity: 0.6 }]}>
                <View style={[styles.dot, { backgroundColor: colors.secondary }]} />
                <Text style={styles.maintenanceItemText} numberOfLines={1}>
                  Needs review
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Animated.View entering={FadeInUp.delay(300).duration(500)}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.headerLine} />
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('AddTenant')}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIconCircle, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="person-add-outline" size={24} color={colors.primary} />
              </View>
              <Text style={[styles.actionLabel, { color: colors.primary }]}>
                Add New Tenant
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('RecordPayment')}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIconCircle, { backgroundColor: '#FFF3CD' }]}>
                <Ionicons name="receipt-outline" size={24} color={colors.onSecondaryContainer} />
              </View>
              <Text style={[styles.actionLabel, { color: colors.onSecondaryContainer }]}>
                Record Payment
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() =>
                Alert.alert('Post Notice', 'Navigate to the notices section to post a new notice.')
              }
              activeOpacity={0.7}
            >
              <View style={[styles.actionIconCircle, { backgroundColor: colors.surfaceContainerHighest }]}>
                <Ionicons name="megaphone-outline" size={24} color={colors.textSecondary} />
              </View>
              <Text style={[styles.actionLabel, { color: colors.textSecondary }]}>
                Post Notice
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>

      {/* Recent Logs */}
      <View style={styles.section}>
        <Animated.View entering={FadeInUp.delay(400).duration(500)}>
          <View style={styles.logsCard}>
            <View style={styles.logsHeader}>
              <Text style={styles.logsTitle}>Recent Logs</Text>
            </View>
            {recentLogs.map((log, idx) => (
              <View
                key={idx}
                style={[
                  styles.logItem,
                  idx < recentLogs.length - 1 && styles.logItemBorder,
                ]}
              >
                <View style={[styles.logIconWrap, { backgroundColor: log.iconBg }]}>
                  <Ionicons name={log.icon} size={20} color={log.iconColor} />
                </View>
                <View style={styles.logContent}>
                  <Text style={styles.logTitle}>{log.title}</Text>
                  <Text style={styles.logSubtitle}>{log.subtitle}</Text>
                </View>
                <Text style={styles.logTime}>{log.time}</Text>
              </View>
            ))}
          </View>
        </Animated.View>
      </View>

      {/* Properties */}
      <View style={styles.section}>
        <Animated.View entering={FadeInUp.delay(500).duration(500)}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Your Properties</Text>
            <View style={styles.headerLine} />
          </View>
        </Animated.View>

        {properties.length === 0 && !error && (
          <Animated.View entering={FadeInUp.delay(550).duration(500)}>
            <TouchableOpacity
              style={styles.emptyPropertyCard}
              onPress={() => navigation.navigate('AddProperty')}
              activeOpacity={0.7}
            >
              <View style={styles.emptyPropertyIcon}>
                <Ionicons name="add-circle-outline" size={36} color={colors.primary} />
              </View>
              <Text style={styles.emptyPropertyTitle}>No properties yet</Text>
              <Text style={styles.emptyPropertySub}>
                Tap here to add your first property
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {properties.map((prop, index) => (
          <Animated.View
            key={prop.id}
            entering={FadeInUp.delay(550 + index * 80).duration(500)}
          >
            <TouchableOpacity
              style={styles.propertyCard}
              onPress={() =>
                navigation.navigate('PropertyDetail', { propertyId: prop.id })
              }
              activeOpacity={0.7}
            >
              <View style={styles.propertyHeader}>
                <View style={styles.propertyIcon}>
                  <Ionicons name="business" size={20} color={colors.primary} />
                </View>
                <View style={styles.propertyInfo}>
                  <Text style={styles.propertyName}>{prop.name}</Text>
                  <View style={styles.propertyCityRow}>
                    <Ionicons
                      name="location-outline"
                      size={12}
                      color={colors.textLight}
                    />
                    <Text style={styles.propertyCity}>{prop.city}</Text>
                  </View>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={colors.textLight}
                />
              </View>
              <View style={styles.propertyMeta}>
                <View style={styles.metaChip}>
                  <Ionicons name="grid-outline" size={13} color={colors.textSecondary} />
                  <Text style={styles.metaChipText}>
                    {prop._count?.rooms || 0} Rooms
                  </Text>
                </View>
                {prop.amenities?.slice(0, 2).map((a: string) => (
                  <View key={a} style={styles.amenityChip}>
                    <Text style={styles.amenityText}>{a}</Text>
                  </View>
                ))}
                {prop.amenities?.length > 2 && (
                  <Text style={styles.moreAmenities}>
                    +{prop.amenities.length - 2}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: 40,
  },

  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 8,
    backgroundColor: colors.background,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    marginTop: 4,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  avatarBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 24,
    marginTop: 12,
    padding: 12,
    backgroundColor: colors.errorContainer,
    borderRadius: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: colors.error,
  },
  retryText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },

  section: {
    paddingHorizontal: 24,
    marginTop: 24,
  },

  // Bento — Occupancy
  occupancyCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    ...shadows.md,
  },
  occupancyTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  bentoLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: colors.primary,
  },
  bentoIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primary + '14',
    alignItems: 'center',
    justifyContent: 'center',
  },
  occupancyValueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    marginBottom: 16,
  },
  occupancyPercent: {
    fontSize: 48,
    fontWeight: '800',
    color: colors.primary,
    lineHeight: 52,
  },
  occupancyCapacity: {
    fontSize: 14,
    color: colors.textSecondary,
    paddingBottom: 6,
  },
  progressTrack: {
    width: '100%',
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.surfaceContainerHighest,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  occupancyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  occupiedText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  vacantText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  // Bento row
  bentoRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },

  // Pending Payments
  pendingCard: {
    flex: 1,
    backgroundColor: colors.secondaryContainer,
    borderRadius: 16,
    padding: 20,
    overflow: 'hidden',
    justifyContent: 'space-between',
    minHeight: 200,
  },
  pendingContent: {
    zIndex: 1,
  },
  pendingLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: colors.onSecondaryContainer,
    opacity: 0.8,
  },
  pendingAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.onSecondaryContainer,
    marginTop: 12,
  },
  pendingSubtext: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.onSecondaryContainer,
    marginTop: 4,
    opacity: 0.8,
  },
  reviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.onSecondaryContainer,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 16,
    zIndex: 1,
  },
  reviewBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
  },
  pendingWatermark: {
    position: 'absolute',
    right: -8,
    bottom: -8,
    opacity: 0.15,
    transform: [{ rotate: '12deg' }],
  },

  // Maintenance
  maintenanceCard: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 16,
    padding: 20,
    justifyContent: 'space-between',
    minHeight: 200,
  },
  maintenanceTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  maintenanceLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: colors.textLight,
  },
  maintenanceIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  maintenanceValueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    marginBottom: 16,
  },
  maintenanceCount: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 40,
  },
  maintenanceActive: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    paddingBottom: 4,
  },
  maintenanceItems: {
    gap: 8,
  },
  maintenanceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    padding: 10,
    borderRadius: 10,
  },
  maintenanceItemText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },

  // Section headers
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  headerLine: {
    flex: 1,
    height: 2,
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: 1,
  },

  // Quick Actions
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 8,
    backgroundColor: colors.surface,
    borderRadius: 16,
    ...shadows.sm,
  },
  actionIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 16,
  },

  // Recent Logs
  logsCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 16,
    padding: 24,
  },
  logsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  logsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  logItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  logItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant + '18',
  },
  logIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  logContent: {
    flex: 1,
  },
  logTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  logSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  logTime: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textLight,
  },

  // Properties
  emptyPropertyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.primaryLight,
    borderStyle: 'dashed',
  },
  emptyPropertyIcon: {
    marginBottom: 12,
  },
  emptyPropertyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  emptyPropertySub: {
    fontSize: 13,
    color: colors.textLight,
    marginTop: 4,
  },
  propertyCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    ...shadows.sm,
  },
  propertyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  propertyIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primary + '12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  propertyInfo: {
    flex: 1,
  },
  propertyName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  propertyCityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  propertyCity: {
    fontSize: 12,
    color: colors.textLight,
  },
  propertyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    flexWrap: 'wrap',
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  metaChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  amenityChip: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  amenityText: {
    fontSize: 11,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  moreAmenities: {
    fontSize: 11,
    color: colors.textLight,
    fontWeight: '600',
  },
});
