import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { useAuth } from '../../context/AuthContext';

export function ProfileScreen() {
  const { user, logout } = useAuth();

  const menuItems = [
    { icon: 'document-text-outline' as const, label: 'My Documents', subtitle: 'ID proofs & verification' },
    { icon: 'receipt-outline' as const, label: 'Payment History', subtitle: 'Past payments & receipts' },
    { icon: 'home-outline' as const, label: 'My Lease', subtitle: 'Current lease agreement' },
    { icon: 'help-circle-outline' as const, label: 'Help & Support', subtitle: 'FAQs and contact info' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.name?.charAt(0)?.toUpperCase() || '?'}
          </Text>
        </View>
        <Text style={styles.name}>{user?.name || 'Tenant'}</Text>
        <Text style={styles.role}>Tenant</Text>
      </View>

      <View style={styles.menu}>
        {menuItems.map((item) => (
          <TouchableOpacity key={item.label}>
            <Card style={styles.menuItem}>
              <View style={styles.menuRow}>
                <View style={styles.menuIcon}>
                  <Ionicons name={item.icon} size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
              </View>
            </Card>
          </TouchableOpacity>
        ))}
      </View>

      <Button
        title="Logout"
        onPress={logout}
        variant="danger"
        style={{ marginHorizontal: 16, marginTop: 8 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 28, fontWeight: '700', color: colors.white },
  name: { fontSize: 20, fontWeight: '700', color: colors.text },
  role: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  menu: { padding: 16, gap: 8 },
  menuItem: { padding: 14 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: { fontSize: 15, fontWeight: '600', color: colors.text },
  menuSubtitle: { fontSize: 12, color: colors.textLight, marginTop: 2 },
});
