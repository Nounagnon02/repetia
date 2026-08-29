/**
 * Palette RépétIA — reprise à l'identique du client web
 * (`frontend/src/index.css`), pour que les deux applications se ressemblent.
 *
 * NativeWind expose ces mêmes couleurs en classes (`bg-brand-green`…) via
 * `tailwind.config.js`. Ces constantes servent pour les propriétés qui ne
 * passent pas par les classes : `ActivityIndicator`, `StatusBar`, options de
 * navigation, ombres.
 */
export const couleurs = {
  paper: '#fbf7ee',
  green: '#0f5f52',
  greenDark: '#0a453c',
  gold: '#d99a1f',
  goldSoft: '#f6e9c7',
  ink: '#20302b',
  correctText: '#0f8a5f',
  correctBg: '#e7f6ec',
  wrongText: '#c0432f',
  wrongBg: '#fbeae3',
  lines: '#e7ddc7',
  grisTexte: '#5c6b66',
  blanc: '#ffffff',
} as const;

export const rayons = { sm: 8, md: 12, lg: 16, xl: 20, pilule: 999 } as const;

export type Couleur = keyof typeof couleurs;
