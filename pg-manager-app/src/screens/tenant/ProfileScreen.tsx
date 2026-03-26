import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadows } from '../../theme/colors';
import { Card } from '../../components/Card';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

interface TenantProfile {
  id: string;
  name: string;
  phone: string;
  email?: string;
  status: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  leases?: {
    status: string;
    rentAmount: number;
    billingDay: number;
    moveInDate: string;
    securityDeposit: number;
    depositStatus: string;
    property?: { name: string; address: string };
    bed?: { label: string; room: { roomNumber: string } };
  }[];
}

export function ProfileScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<TenantProfile | null>(null);

  useEffect(() => {
    if (user) {
      api.tenants.getProfile(user.id).then((res) => {
        setProfile(res.data as unknown as TenantProfile);
      }).catch(() => {
        // Fallback to basic user data
        setProfile({
          id: user.id,
          name: user.name,
          phone: '',
          status: 'active',
        });
      });
    }
  }, [user]);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout },
      ],
    );
  };

  if (!profile) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const activeLease = profile.leases?.find((l) => l.status === 'active');

  const menuItems = [
    { icon: 'document-text-outline' as const, label: 'Documents', screen: 'Documents' },
    { icon: 'wallet-outline' as const, label: 'Pay Rent', screen: 'PayRent' },
    { icon: 'chatbubble-outline' as const, label: 'Raise Complaint', screen: 'RaiseComplaint' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Avatar & Name */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {profile.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.name}>{profile.name}</Text>
        <Text style={styles.phone}>{profile.phone || user?.name}</Text>
      </View>

      {/* Lease Info */}
      {activeLease && (
        <Card style={styles.leaseCard} variant="elevated">
          <Text style={styles.leaseTitle}>Your Room</Text>
          <View style={styles.leaseGrid}>
            <View style={styles.leaseItem}>
              <Ionicons name="business-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.leaseValue}>{activeLease.property?.name || 'N/A'}</Text>
            </View>
            <View style={styles.leaseItem}>
              <Ionicons name="bed-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.leaseValue}>
                Room {activeLease.bed?.room?.roomNumber} · {activeLease.bed?.label}
              </Text>
            </View>
            <View style={styles.leaseItem}>
              <Ionicons name="wallet-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.leaseValue}>₹{Number(activeLease.rentAmount).toLocaleString()}/mo</Text>
            </View>
            <View style={styles.leaseItem}>
              <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.leaseValue}>
                Since {new Date(activeLease.moveInDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
              </Text>
            </View>
          </View>
        </Card>
      )}

      {/* Contact Info */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Contact</Text>
        <View style={styles.detailRow}>
          <Ionicons name="call-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.detailValue}>{profile.phone || 'Not available'}</Text>
        </View>
        {profile.email && (
          <View style={styles.detailRow}>
            <Ionicons name="mail-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.detailValue}>{profile.email}</Text>
          </View>
        )}
        {profile.emergencyContactName && (
          <View style={styles.detailRow}>
            <Ionicons name="alert-circle-outline" size={16} color={colors.warning} />
            <Text style={styles.detailValue}>
              {profile.emergencyContactName} · {profile.emergencyContactPhone}
            </Text>
          </View>
        )}
      </Card>

      {/* Quick Actions */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        {menuItems.map((item, i) => (
          <TouchableOpacity
            key={item.label}
            style={[
              styles.menuRow,
              i === menuItems.length - 1 && { borderBottomWidth: 0 },
            ]}
            onPress={() => navigation.navigate(item.screen)}
          >
            <Ionicons name={item.icon} size={20} color={colors.primary} />
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
          </TouchableOpacity>
        ))}
      </Card>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#EF4444" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 40 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: colors.textSecondary },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.white,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginTop: 12,
  },
  phone: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  leaseCard: { marginBottom: 16 },
  leaseTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  leaseGrid: { gap: 8 },
  leaseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  leaseValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  detailValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: 12,
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    backgroundColor: '#FEF2F2',
    marginTop: 8,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EF4444',
  },
});
