import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadows } from '../theme/colors';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  iconBg?: string;
  subtitle?: string;
}

export function StatCard({
  title,
  value,
  icon,
  iconColor = colors.primary,
  iconBg = colors.primaryLight + '30',
  subtitle,
}: StatCardProps) {
  return (
    <View style={[styles.container, shadows.sm]}>
      <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    flex: 1,
    minWidth: 140,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  title: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  subtitle: {
    fontSize: 11,
    color: colors.textLight,
    marginTop: 2,
  },
});
