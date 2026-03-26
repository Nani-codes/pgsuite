import React, { useEffect, useState } from 'react';
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
import Toast from 'react-native-toast-message';
import { colors, shadows } from '../../theme/colors';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Skeleton } from '../../components/Skeleton';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

interface OwnerProfile {
  id: string;
  name: string;
  phone: string;
  email?: string;
  plan: string;
  _count: { properties: number; tenants: number };
}

export function OwnerProfileScreen() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<OwnerProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  const loadProfile = async () => {
    if (!user) return;
    try {
      const res = await api.owner.getProfile(user.id);
      setProfile(res.data);
      setName(res.data.name);
      setEmail(res.data.email || '');
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [user]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }
    setSaving(true);
    try {
      await api.owner.updateProfile(user!.id, {
        name: name.trim(),
        email: email.trim() || undefined,
      });
      setEditing(false);
      await loadProfile();
      Toast.show({
        type: 'success',
        text1: 'Profile Updated',
        text2: 'Your information has been saved successfully',
      });
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Error Updating Profile',
        text2: err.message,
      });
    } finally {
      setSaving(false);
    }
  };

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
      <View style={[styles.container, styles.content]}>
        <View style={styles.profileHeader}>
          <Skeleton width={80} height={80} borderRadius={40} style={{ marginBottom: 12 }} />
          <Skeleton width={150} height={24} style={{ marginBottom: 4 }} />
          <Skeleton width={100} height={16} style={{ marginBottom: 12 }} />
          <Skeleton width={120} height={28} borderRadius={14} />
        </View>
        <View style={styles.statsRow}>
          <Skeleton style={{ flex: 1, height: 80 }} />
          <Skeleton style={{ flex: 1, height: 80 }} />
        </View>
        <Skeleton style={{ height: 200, marginBottom: 16 }} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Avatar & Name Card */}
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {profile.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.name}>{profile.name}</Text>
        <Text style={styles.phone}>{profile.phone}</Text>
        <View style={styles.planBadge}>
          <Ionicons name="diamond-outline" size={14} color={colors.primary} />
          <Text style={styles.planText}>{profile.plan.toUpperCase()} Plan</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <Text style={styles.statNumber}>{profile._count.properties}</Text>
          <Text style={styles.statLabel}>Properties</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statNumber}>{profile._count.tenants}</Text>
          <Text style={styles.statLabel}>Tenants</Text>
        </Card>
      </View>

      {/* Edit Profile Section */}
      <Card style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Profile Details</Text>
          {!editing && (
            <TouchableOpacity onPress={() => setEditing(true)}>
              <Ionicons name="create-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>

        {editing ? (
          <>
            <Text style={styles.label}>NAME</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Full name"
              placeholderTextColor={colors.textLight}
            />
            <Text style={styles.label}>EMAIL</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="email@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={colors.textLight}
            />
            <View style={styles.editActions}>
              <Button
                title="Cancel"
                onPress={() => {
                  setEditing(false);
                  setName(profile.name);
                  setEmail(profile.email || '');
                }}
                variant="outline"
                size="sm"
                style={{ flex: 1 }}
              />
              <Button
                title="Save"
                onPress={handleSave}
                loading={saving}
                size="sm"
                style={{ flex: 1 }}
              />
            </View>
          </>
        ) : (
          <>
            <View style={styles.detailRow}>
              <Ionicons name="person-outline" size={18} color={colors.textSecondary} />
              <View>
                <Text style={styles.detailLabel}>Name</Text>
                <Text style={styles.detailValue}>{profile.name}</Text>
              </View>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="call-outline" size={18} color={colors.textSecondary} />
              <View>
                <Text style={styles.detailLabel}>Phone</Text>
                <Text style={styles.detailValue}>{profile.phone}</Text>
              </View>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="mail-outline" size={18} color={colors.textSecondary} />
              <View>
                <Text style={styles.detailLabel}>Email</Text>
                <Text style={styles.detailValue}>{profile.email || 'Not set'}</Text>
              </View>
            </View>
          </>
        )}
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
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  avatarText: {
    fontSize: 32,
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
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
  },
  planText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  section: { marginBottom: 16 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
    marginTop: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  detailLabel: {
    fontSize: 12,
    color: colors.textLight,
  },
  detailValue: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '500',
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
