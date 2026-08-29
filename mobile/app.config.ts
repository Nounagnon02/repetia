import type { ExpoConfig } from 'expo/config';

/**
 * Configuration Expo de RépétIA Mobile.
 *
 * L'URL de l'API est surchargeable par la variable d'environnement
 * `EXPO_PUBLIC_API_BASE_URL` (voir `src/services/api.ts` pour la valeur par
 * défaut, déduite automatiquement de l'hôte Metro).
 *
 * Aucune clé IA ici : l'application mobile ne parle qu'au backend RépétIA.
 */
const config: ExpoConfig = {
  name: 'RépétIA',
  slug: 'repetia',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'repetia',
  userInterfaceStyle: 'light',
  backgroundColor: '#fbf7ee',
  android: {
    package: 'bj.repetia.mobile',
    adaptiveIcon: {
      backgroundColor: '#0f5f52',
      foregroundImage: './assets/images/android-icon-foreground.png',
    },
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'bj.repetia.mobile',
  },
  web: { output: 'static', favicon: './assets/images/favicon.png' },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      { backgroundColor: '#0f5f52', image: './assets/images/splash-icon.png', imageWidth: 96 },
    ],
  ],
  experiments: { typedRoutes: true },
  extra: {
    eas: { projectId: process.env.EAS_PROJECT_ID },
  },
};

export default config;
