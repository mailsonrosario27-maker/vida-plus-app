// Config dinâmica (em vez de app.json estático) para poder injetar a URL da
// API de cada ambiente via variável de env do perfil do EAS Build (eas.json).
// Em desenvolvimento (expo start), API_URL fica vazio de propósito — o app
// descobre o endereço certo sozinho (ver src/api/client.ts).
module.exports = {
  expo: {
    name: 'VIDA+',
    slug: 'vida-plus',
    version: '0.1.0',
    orientation: 'portrait',
    userInterfaceStyle: 'automatic',
    splash: {
      backgroundColor: '#F7F5F0',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'app.vidaplus.mobile',
    },
    android: {
      package: 'app.vidaplus.mobile',
      adaptiveIcon: {
        backgroundColor: '#F7F5F0',
      },
    },
    web: {
      bundler: 'metro',
    },
    plugins: ['expo-secure-store'],
    extra: {
      apiUrl: process.env.API_URL || '',
      eas: {
        projectId: process.env.EAS_PROJECT_ID || undefined,
      },
    },
  },
};
