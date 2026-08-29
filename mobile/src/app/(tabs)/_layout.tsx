import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { couleurs } from '@/constants/theme';

/** Onglets du bas : Accueil, Chat et Progression. */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: couleurs.green,
        tabBarInactiveTintColor: couleurs.grisTexte,
        tabBarStyle: {
          backgroundColor: couleurs.blanc,
          borderTopColor: couleurs.lines,
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.6 }}>🏠</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Répétiteur',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.6 }}>💬</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="progression"
        options={{
          title: 'Progression',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.6 }}>📈</Text>
          ),
        }}
      />
    </Tabs>
  );
}
