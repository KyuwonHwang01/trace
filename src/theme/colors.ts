export const colors = {
  background: '#0c0c0e',
  surface: '#18181b',
  surfaceElevated: '#27272a',
  border: '#27272a',
  borderStrong: '#3f3f46',

  text: '#fafafa',
  textMuted: '#a1a1aa',
  textSubtle: '#71717a',

  accent: '#c75361',
  accentDeep: '#7a2a3a',
  accentSoft: 'rgba(199, 83, 97, 0.15)',

  white: '#ffffff',
  black: '#000000',
  overlay: 'rgba(0, 0, 0, 0.65)',
  overlaySoft: 'rgba(0, 0, 0, 0.45)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 6,
  md: 12,
  lg: 20,
  full: 9999,
};

export const fonts = {
  serif: 'Lora_500Medium',
  serifBold: 'Lora_600SemiBold',
  serifItalic: 'Lora_400Regular_Italic',
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemibold: 'Inter_600SemiBold',
  sansBold: 'Inter_700Bold',
};

export const typography = {
  serif: fonts.serif,
  serifBold: fonts.serifBold,
};

export const text = {
  display: { fontFamily: fonts.serifBold, fontSize: 34, letterSpacing: -0.5 },
  title: { fontFamily: fonts.serifBold, fontSize: 22, letterSpacing: -0.3 },
  heading: { fontFamily: fonts.serif, fontSize: 18 },
  body: { fontFamily: fonts.sans, fontSize: 15 },
  bodyMedium: { fontFamily: fonts.sansMedium, fontSize: 15 },
  meta: { fontFamily: fonts.sans, fontSize: 13 },
  metaMedium: { fontFamily: fonts.sansMedium, fontSize: 13 },
  caption: { fontFamily: fonts.sans, fontSize: 11, letterSpacing: 0.5 },
  button: { fontFamily: fonts.sansSemibold, fontSize: 15, letterSpacing: 0.2 },
  numeric: { fontFamily: fonts.sansMedium, fontSize: 13 },
};
