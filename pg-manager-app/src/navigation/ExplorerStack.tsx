import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { PropertyShowcaseListScreen } from '../screens/explorer/PropertyShowcaseListScreen';
import { PropertyShowcaseDetailScreen } from '../screens/explorer/PropertyShowcaseDetailScreen';

const Stack = createNativeStackNavigator();

export function ExplorerStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="PropertyShowcaseList"
        component={PropertyShowcaseListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PropertyShowcaseDetail"
        component={PropertyShowcaseDetailScreen}
        options={{ title: 'Property Details' }}
      />
    </Stack.Navigator>
  );
}
