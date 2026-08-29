// Les matchers de @testing-library/react-native v14 sont intégrés : pas d'import.

// AsyncStorage : mock officiel fourni par la bibliothèque.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// expo-crypto : identifiant déterministe pour des tests reproductibles.
jest.mock('expo-crypto', () => ({
  randomUUID: () => '11111111-2222-4333-8444-555555555555',
}));

// L'hôte Metro n'existe pas en test : on fige l'URL de l'API.
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { hostUri: '192.168.1.50:8081' }, expoGoConfig: null },
}));

// Silence les avertissements d'animation non pertinents ici.
jest.spyOn(console, 'warn').mockImplementation(() => {});
