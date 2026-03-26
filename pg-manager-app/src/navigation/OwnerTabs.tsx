import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

import { DashboardScreen } from '../screens/owner/DashboardScreen';
import { PropertyDetailScreen } from '../screens/owner/PropertyDetailScreen';
import { AddPropertyScreen } from '../screens/owner/AddPropertyScreen';
import { RecordPaymentScreen } from '../screens/owner/RecordPaymentScreen';
import { AddExpenseScreen } from '../screens/owner/AddExpenseScreen';
import { AddDuesScreen } from '../screens/owner/AddDuesScreen';
import { TenantsScreen } from '../screens/owner/TenantsScreen';
import { AddTenantScreen } from '../screens/owner/AddTenantScreen';
import { TenantDetailScreen } from '../screens/owner/TenantDetailScreen';
import { EditTenantScreen } from '../screens/owner/EditTenantScreen';
import { ExpenseHistoryScreen } from '../screens/owner/ExpenseHistoryScreen';
import { ComplaintsScreen } from '../screens/owner/ComplaintsScreen';
import { PaymentTrackerScreen } from '../screens/owner/PaymentTrackerScreen';
import { OwnerProfileScreen } from '../screens/owner/ProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const stackScreenOptions = {
  headerStyle: { backgroundColor: colors.surface },
  headerShadowVisible: false,
  headerTintColor: colors.text,
  headerTitleStyle: { fontWeight: '600' as const },
};

function DashboardStack() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen
        name="DashboardHome"
        component={DashboardScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PropertyDetail"
        component={PropertyDetailScreen}
        options={{ title: 'Room Management' }}
      />
      <Stack.Screen
        name="AddProperty"
        component={AddPropertyScreen}
        options={{ title: 'Add Property' }}
      />
      <Stack.Screen
        name="RecordPayment"
        component={RecordPaymentScreen}
        options={{ title: 'Record Payment' }}
      />
      <Stack.Screen
        name="AddExpense"
        component={AddExpenseScreen}
        options={{ title: 'Add Expense' }}
      />
      <Stack.Screen
        name="ExpenseHistory"
        component={ExpenseHistoryScreen}
        options={{ title: 'Expense History' }}
      />
      <Stack.Screen
        name="AddDues"
        component={AddDuesScreen}
        options={{ title: 'Add Dues' }}
      />
      <Stack.Screen
        name="AddTenant"
        component={AddTenantScreen}
        options={{ title: 'Add Tenant' }}
      />
    </Stack.Navigator>
  );
}

function TenantsStack() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen
        name="TenantsList"
        component={TenantsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AddTenant"
        component={AddTenantScreen}
        options={{ title: 'Add Tenant' }}
      />
      <Stack.Screen
        name="TenantDetail"
        component={TenantDetailScreen}
        options={{ title: 'Tenant Profile' }}
      />
      <Stack.Screen
        name="EditTenant"
        component={EditTenantScreen}
        options={{ title: 'Edit Tenant' }}
      />
    </Stack.Navigator>
  );
}

function PaymentsStack() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen
        name="PaymentTrackerHome"
        component={PaymentTrackerScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="RecordPayment"
        component={RecordPaymentScreen}
        options={{ title: 'Record Payment' }}
      />
    </Stack.Navigator>
  );
}

export function OwnerTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';
          if (route.name === 'Dashboard')
            iconName = focused ? 'grid' : 'grid-outline';
          else if (route.name === 'Tenants')
            iconName = focused ? 'people' : 'people-outline';
          else if (route.name === 'Payments')
            iconName = focused ? 'card' : 'card-outline';
          else if (route.name === 'Requests')
            iconName = focused ? 'construct' : 'construct-outline';
          else if (route.name === 'Profile')
            iconName = focused ? 'person' : 'person-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textLight,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.borderLight,
          paddingTop: 4,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginBottom: 4,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardStack} />
      <Tab.Screen name="Tenants" component={TenantsStack} />
      <Tab.Screen name="Payments" component={PaymentsStack} />
      <Tab.Screen name="Requests" component={ComplaintsScreen} />
      <Tab.Screen name="Profile" component={OwnerProfileScreen} />
    </Tab.Navigator>
  );
}
