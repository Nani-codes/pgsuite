import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { OwnerTabs } from './OwnerTabs';
import { TenantTabs } from './TenantTabs';
import { colors } from '../theme/colors';

const Stack = createNativeStackNavigator();

export function AppNavigator() {
  const { user, isHydrating } = useAuth();

  if (isHydrating) {
    return (
      <View style={styles.splash}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoText}>PG</Text>
        </View>
        <Text style={styles.splashTitle}>PG Manager</Text>
        <ActivityIndicator
          size="small"
          color={colors.primary}
          style={styles.spinner}
        />
      </View>
    );
  }

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

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.white,
  },
  splashTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  spinner: {
    marginTop: 20,
  },
});
