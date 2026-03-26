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

interface Expense {
  id: string;
  category: string;
  amount: number;
  description: string;
  date: string;
  createdAt: string;
  property?: { name: string };
}

const categoryIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  maintenance: 'construct-outline',
  utility: 'flash-outline',
  cleaning: 'water-outline',
  repair: 'build-outline',
  supplies: 'cube-outline',
  other: 'ellipsis-horizontal-outline',
};

export function ExpenseHistoryScreen() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    if (!user) return;
    try {
      const res = await api.expenses.list(user.id);
      setExpenses(res.data as Expense[]);
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

  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const renderExpense = ({ item }: { item: Expense }) => {
    const icon = categoryIcons[item.category] || 'help-circle-outline';
    return (
      <Card style={styles.expenseCard}>
        <View style={styles.expenseRow}>
          <View style={styles.iconBg}>
            <Ionicons name={icon} size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.expenseDesc}>{item.description}</Text>
            <Text style={styles.expenseMeta}>
              {item.category} · {item.property?.name || 'N/A'} · {new Date(item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </Text>
          </View>
          <Text style={styles.expenseAmount}>
            ₹{Number(item.amount).toLocaleString()}
          </Text>
        </View>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={expenses}
        renderItem={renderExpense}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <View>
            <Text style={styles.title}>Expense History</Text>
            {expenses.length > 0 && (
              <Card style={styles.summaryCard} variant="elevated">
                <Text style={styles.summaryLabel}>Total Expenses</Text>
                <Text style={styles.summaryAmount}>
                  ₹{totalExpenses.toLocaleString()}
                </Text>
                <Text style={styles.summaryCount}>
                  {expenses.length} expense{expenses.length > 1 ? 's' : ''}
                </Text>
              </Card>
            )}
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="receipt-outline"
            title="No expenses"
            subtitle="Expenses you record will appear here"
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
    marginBottom: 12,
  },
  summaryCard: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 16,
  },
  summaryLabel: { fontSize: 13, color: colors.textSecondary },
  summaryAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    marginVertical: 4,
  },
  summaryCount: { fontSize: 12, color: colors.textLight },
  expenseCard: { marginBottom: 8 },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expenseDesc: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  expenseMeta: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  expenseAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
});
