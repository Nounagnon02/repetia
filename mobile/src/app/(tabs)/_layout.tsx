import { Tabs } from 'expo-router';
import { Home, MessageCircle, TrendingUp } from 'lucide-react-native';
import { couleurs } from '@/constants/theme';

/** Onglets du bas : Accueil, Répétiteur et Progression. */
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
          height: 72,
          paddingTop: 8,
          paddingBottom: 12,
        },
        // `lineHeight` explicite : sans lui la boîte de ligne tombe à 11 px pour
        // un texte de 12 px, et les jambages de « Progression » sont rognés.
        tabBarLabelStyle: { fontSize: 12, lineHeight: 16, fontWeight: '600', marginTop: 2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Répétiteur',
          tabBarIcon: ({ color, size }) => <MessageCircle size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="progression"
        options={{
          title: 'Progression',
          tabBarIcon: ({ color, size }) => <TrendingUp size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
