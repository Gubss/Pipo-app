// Design system do app. Sem dependências: importe direto nas telas.
// Fontes: npx expo install @expo-google-fonts/nunito @expo-google-fonts/baloo-2 expo-font
// e carregue `fontsToLoad` com useFonts(fontsToLoad) no _layout.

export const colors = {
  bg: '#FFF8F1', // creme, fundo de todas as telas
  card: '#FFFFFF',
  cardSoft: '#FFF1E6', // card de destaque leve, bolha do Pipo no chat
  text: '#2B2340',
  textSoft: '#6E6585',
  textFaint: '#A59DB8',
  primary: '#FF7A59', // coral: botões principais, FAB, aba ativa
  primaryDark: '#E85D3C', // pressed, texto sobre primarySoft
  primarySoft: '#FFE3D9',
  purple: '#7C6CF2', // voz/microfone, família, links
  purpleSoft: '#ECE9FF',
  mint: '#2FBF8F', // concluído, sucesso, streak
  mintSoft: '#DDF6EC',
  yellow: '#FFC94D', // lembrete chegando, pontos, conquistas
  yellowSoft: '#FFF3D1',
  danger: '#E5484D',
  border: '#F0E6DC',
  white: '#FFFFFF',
};

// Cor de cada categoria de lembrete (chip, ponto no calendário, barra no resumo)
export const categoryColors = {
  evento: { fg: colors.purple, bg: colors.purpleSoft, emoji: '🎉' },
  cuidado: { fg: colors.primaryDark, bg: colors.primarySoft, emoji: '💇' },
  compra: { fg: '#C98A00', bg: colors.yellowSoft, emoji: '🎁' },
  saude: { fg: colors.mint, bg: colors.mintSoft, emoji: '💊' },
  outro: { fg: colors.textSoft, bg: '#F3EEF8', emoji: '📌' },
} as const;

export const spacing = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 20, xl: 28, xxl: 40 };

export const radius = { sm: 12, md: 18, lg: 26, xl: 32, pill: 999 };

export const shadow = {
  shadowColor: '#7A4B2A',
  shadowOpacity: 0.08,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 6 },
  elevation: 3,
};

// Sombra "carimbada" dos botões grandes (efeito fofinho de botão 3D)
export const buttonDepth = {
  primary: { borderBottomWidth: 4, borderBottomColor: colors.primaryDark },
  soft: { borderBottomWidth: 3, borderBottomColor: colors.border },
};

export const fonts = {
  display: 'Baloo2_800ExtraBold',
  displaySemi: 'Baloo2_700Bold',
  body: 'Nunito_400Regular',
  bodySemi: 'Nunito_600SemiBold',
  bodyBold: 'Nunito_700Bold',
  bodyBlack: 'Nunito_800ExtraBold',
};

export const font = {
  hero: { fontFamily: fonts.display, fontSize: 34, lineHeight: 40, color: colors.text, letterSpacing: -0.5 },
  title: { fontFamily: fonts.display, fontSize: 28, lineHeight: 34, color: colors.text, letterSpacing: -0.5 },
  h2: { fontFamily: fonts.displaySemi, fontSize: 20, lineHeight: 26, color: colors.text },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 23, color: colors.text },
  bodyStrong: { fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 23, color: colors.text },
  button: { fontFamily: fonts.bodyBlack, fontSize: 17, letterSpacing: 0.2 },
  small: { fontFamily: fonts.bodySemi, fontSize: 13, lineHeight: 18, color: colors.textSoft },
  caption: { fontFamily: fonts.bodyBold, fontSize: 11, lineHeight: 14, color: colors.textFaint, letterSpacing: 0.8, textTransform: 'uppercase' as const },
};

// Para o useFonts(). Mantido aqui para os nomes baterem com `fonts`.
export const fontPackages = {
  '@expo-google-fonts/nunito': ['Nunito_400Regular', 'Nunito_600SemiBold', 'Nunito_700Bold', 'Nunito_800ExtraBold'],
  '@expo-google-fonts/baloo-2': ['Baloo2_700Bold', 'Baloo2_800ExtraBold'],
};

// Tom de voz do Pipo, escolhido pelo usuário no onboarding/config
export type PipoTone = 'calmo' | 'parceiro' | 'zoeiro';
