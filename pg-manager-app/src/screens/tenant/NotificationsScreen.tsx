import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import type { AppNotification } from '../../types';

const typeIcons: Record<
  string,
  { icon: keyof typeof Ionicons.glyphMap; color: string }
> = {
  rent_due: { icon: 'wallet-outline', color: colors.warning },
  payment_success: { icon: 'checkmark-circle-outline', color: colors.secondary },
  complaint_update: { icon: 'chatbubble-outline', color: colors.primary },
  notice: { icon: 'megaphone-outline', color: '#8B5CF6' },
  otp: { icon: 'key-outline', color: colors.textSecondary },
};

export function NotificationsScreen() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    if (!user) return;
    try {
      const res = await api.notifications.list(user.id);
      setNotifications(res.data);
    } catch {
      // May not have notifications
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

  const renderNotification = ({ item }: { item: AppNotification }) => {
    const typeInfo = typeIcons[item.type] || typeIcons.notice;
    return (
      <Card style={styles.notifCard}>
        <View style={styles.notifRow}>
          <View
            style={[
              styles.iconBg,
              { backgroundColor: typeInfo.color + '15' },
            ]}
          >
            <Ionicons
              name={typeInfo.icon}
              size={18}
              color={typeInfo.color}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.notifType}>
              {item.type.replace(/_/g, ' ')}
            </Text>
            <Text style={styles.notifMessage}>{item.message}</Text>
            <Text style={styles.notifTime}>
              {new Date(item.createdAt).toLocaleString('en-IN')}
            </Text>
          </View>
        </View>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <Text style={styles.title}>Notifications</Text>
        }
        ListEmptyComponent={
          <EmptyState
            icon="notifications-off-outline"
            title="No notifications"
            subtitle="You're all caught up!"
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: 16, paddingBottom: 32 },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  notifCard: { marginBottom: 10 },
  notifRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  iconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifType: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  notifMessage: {
    fontSize: 14,
    color: colors.text,
    marginTop: 2,
    lineHeight: 18,
  },
  notifTime: { fontSize: 11, color: colors.textLight, marginTop: 4 },
});
