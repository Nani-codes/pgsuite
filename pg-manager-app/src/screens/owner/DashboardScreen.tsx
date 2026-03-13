import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { StatCard } from '../../components/StatCard';
import { Card } from '../../components/Card';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

export function DashboardScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const [dashboard, setDashboard] = useState<any>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    if (!user) return;
    try {
      const [dash, props] = await Promise.all([
        api.analytics.dashboard(user.id),
        api.properties.list(user.id),
      ]);
      setDashboard(dash.data);
      setProperties(props.data);
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

  const occ = dashboard?.occupancy || {};
  const occupancyRate = occ.total
    ? Math.round((occ.occupied / occ.total) * 100)
    : 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.hero}>
        <View style={styles.heroHeaderRow}>
          <View>
            <Text style={styles.heroTitle}>Property Renting ka</Text>
            <Text style={styles.heroTitleBold}>SuperApp</Text>
            <Text style={styles.heroSubtitle}>
              Save time, work less, earn more
            </Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={22} color={colors.white} />
          </TouchableOpacity>
        </View>

        <View style={styles.quickSummaryRow}>
          <View style={styles.quickSummaryItem}>
            <Text style={styles.quickSummaryLabel}>Today's Collection</Text>
            <Text style={styles.quickSummaryValue}>
              ₹{dashboard?.todayCollection?.toLocaleString?.() || '0'}
            </Text>
          </View>
          <View style={styles.quickSummaryItem}>
            <Text style={styles.quickSummaryLabel}>Total Dues</Text>
            <Text style={styles.quickSummaryValueDanger}>
              ₹{dashboard?.totalDues?.toLocaleString?.() || '0'}
            </Text>
          </View>
        </View>

        <View style={styles.quickActionsCard}>
          <Text style={styles.quickActionsTitle}>Quick Buttons</Text>
          <View style={styles.quickActionsRow}>
            {[
              { icon: 'person-add-outline' as const, label: 'Add Tenant', screen: 'AddTenant' },
              { icon: 'business-outline' as const, label: 'Add Property', screen: 'AddProperty' },
              { icon: 'cash-outline' as const, label: 'Record Payment', screen: 'RecordPayment' },
              { icon: 'construct-outline' as const, label: 'Add Expense', screen: 'AddExpense' },
              { icon: 'alert-circle-outline' as const, label: 'Add Dues', screen: 'AddDues' },
            ].map((item) => (
              <TouchableOpacity
                key={item.label}
                onPress={() => navigation.navigate(item.screen)}
                style={styles.quickActionItem}
              >
                <View style={styles.quickActionIcon}>
                  <Ionicons
                    name={item.icon}
                    size={20}
                    color={colors.primary}
                  />
                </View>
                <Text style={styles.quickActionLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Summary of</Text>
          <Text style={styles.sectionTitleAccent}>
            {user?.name || 'Your PGs'}
          </Text>
        </View>

        <View style={styles.statsRow}>
          <StatCard
            title="Properties"
            value={dashboard?.totalProperties || 0}
            icon="business-outline"
            iconColor={colors.primary}
          />
          <StatCard
            title="Occupancy"
            value={`${occupancyRate}%`}
            icon="bed-outline"
            iconColor={colors.secondary}
            iconBg={colors.secondary + '20'}
            subtitle={`${occ.occupied || 0}/${occ.total || 0} beds`}
          />
        </View>

        <View style={styles.statsRow}>
          <StatCard
            title="Vacant Beds"
            value={occ.vacant || 0}
            icon="checkmark-circle-outline"
            iconColor={colors.vacant}
            iconBg={colors.vacant + '20'}
          />
          <StatCard
            title="Open Complaints"
            value={dashboard?.openComplaints || 0}
            icon="alert-circle-outline"
            iconColor={colors.warning}
            iconBg={colors.warning + '20'}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Properties</Text>

        {properties.map((prop) => (
          <TouchableOpacity
            key={prop.id}
            onPress={() =>
              navigation.navigate('PropertyDetail', {
                propertyId: prop.id,
              })
            }
          >
            <Card style={styles.propertyCard} variant="elevated">
              <View style={styles.propertyHeader}>
                <View style={styles.propertyIcon}>
                  <Ionicons name="business" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.propertyName}>{prop.name}</Text>
                  <Text style={styles.propertyCity}>
                    <Ionicons
                      name="location-outline"
                      size={12}
                      color={colors.textLight}
                    />
                    {' '}
                    {prop.city}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={colors.textLight}
                />
              </View>
              <View style={styles.propertyMeta}>
                <View style={styles.metaItem}>
                  <Ionicons
                    name="grid-outline"
                    size={14}
                    color={colors.textSecondary}
                  />
                  <Text style={styles.metaText}>
                    {prop._count?.rooms || 0} Rooms
                  </Text>
                </View>
                {prop.amenities?.length > 0 && (
                  <View style={styles.amenities}>
                    {prop.amenities.slice(0, 3).map((a: string) => (
                      <View key={a} style={styles.amenityChip}>
                        <Text style={styles.amenityText}>{a}</Text>
                      </View>
                    ))}
                    {prop.amenities.length > 3 && (
                      <Text style={styles.moreAmenities}>
                        +{prop.amenities.length - 3}
                      </Text>
                    )}
                  </View>
                )}
              </View>
            </Card>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 32 },
  hero: {
    paddingTop: 40,
    paddingHorizontal: 20,
    paddingBottom: 24,
    backgroundColor: colors.primary,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
  },
  heroTitleBold: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.white,
  },
  heroSubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
  },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickSummaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  quickSummaryItem: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
  },
  quickSummaryLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  quickSummaryValue: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
  },
  quickSummaryValueDanger: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: '700',
    color: '#FEE2E2',
  },
  quickActionsCard: {
    marginTop: 20,
    padding: 16,
    borderRadius: 20,
    backgroundColor: colors.white,
  },
  quickActionsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 12,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionItem: {
    alignItems: 'center',
    width: 72,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickActionLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  sectionTitleAccent: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  propertyCard: { marginBottom: 12 },
  propertyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  propertyIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  propertyName: { fontSize: 16, fontWeight: '600', color: colors.text },
  propertyCity: { fontSize: 13, color: colors.textLight, marginTop: 2 },
  propertyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: 12,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 13, color: colors.textSecondary },
  amenities: { flexDirection: 'row', gap: 6, flex: 1, flexWrap: 'wrap' },
  amenityChip: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  amenityText: { fontSize: 11, color: colors.textSecondary, textTransform: 'capitalize' },
  moreAmenities: { fontSize: 11, color: colors.textLight, alignSelf: 'center' },
});
