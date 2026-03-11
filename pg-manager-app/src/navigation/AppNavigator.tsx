import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { OwnerTabs } from './OwnerTabs';
import { TenantTabs } from './TenantTabs';

const Stack = createNativeStackNavigator();

export function AppNavigator() {
  const { user } = useAuth();

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : user.role === 'owner' ? (
          <Stack.Screen name="OwnerApp" component={OwnerTabs} />
        ) : (
          <Stack.Screen name="TenantApp" component={TenantTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
