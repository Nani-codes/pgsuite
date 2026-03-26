import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

import { HomeScreen } from '../screens/tenant/HomeScreen';
import { PayRentScreen } from '../screens/tenant/PayRentScreen';
import { TenantDocumentsScreen } from '../screens/tenant/TenantDocumentsScreen';
import { ComplaintsListScreen } from '../screens/tenant/ComplaintsListScreen';
import { TenantComplaintsScreen } from '../screens/tenant/TenantComplaintsScreen';
import { NotificationsScreen } from '../screens/tenant/NotificationsScreen';
import { ProfileScreen } from '../screens/tenant/ProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const stackScreenOptions = {
  headerStyle: { backgroundColor: colors.surface },
  headerShadowVisible: false,
  headerTintColor: colors.text,
  headerTitleStyle: { fontWeight: '600' as const },
};

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen
        name="HomeMain"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PayRent"
        component={PayRentScreen}
        options={{ title: 'Pay Rent' }}
      />
      <Stack.Screen
        name="Documents"
        component={TenantDocumentsScreen}
        options={{ title: 'Documents' }}
      />
    </Stack.Navigator>
  );
}

function ComplaintsStack() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen
        name="ComplaintsList"
        component={ComplaintsListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="RaiseComplaint"
        component={TenantComplaintsScreen}
        options={{ title: 'Raise Complaint' }}
      />
    </Stack.Navigator>
  );
}

export function TenantTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';
          if (route.name === 'Home')
            iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Complaints')
            iconName = focused
              ? 'chatbubble-ellipses'
              : 'chatbubble-ellipses-outline';
          else if (route.name === 'Notifications')
            iconName = focused ? 'notifications' : 'notifications-outline';
          else if (route.name === 'Profile')
            iconName = focused ? 'person' : 'person-outline';
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
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginBottom: 4,
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="Complaints" component={ComplaintsStack} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
