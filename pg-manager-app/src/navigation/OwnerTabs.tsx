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
import { ComplaintsScreen } from '../screens/owner/ComplaintsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function DashboardStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen
        name="DashboardHome"
        component={DashboardScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PropertyDetail"
        component={PropertyDetailScreen}
        options={{ title: 'Property Details' }}
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
        name="AddDues"
        component={AddDuesScreen}
        options={{ title: 'Add Dues' }}
      />
    </Stack.Navigator>
  );
}

function TenantsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
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
          if (route.name === 'Dashboard') iconName = focused ? 'grid' : 'grid-outline';
          else if (route.name === 'Tenants') iconName = focused ? 'people' : 'people-outline';
          else if (route.name === 'Complaints') iconName = focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textLight,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingTop: 4,
          height: 60,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardStack} />
      <Tab.Screen name="Tenants" component={TenantsStack} />
      <Tab.Screen name="Complaints" component={ComplaintsScreen} />
    </Tab.Navigator>
  );
}
