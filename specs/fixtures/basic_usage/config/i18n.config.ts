export default defineI18nConfig(() => ({
  legacy: false,
  locale: 'en',
  messages: {
    fr: {
      welcome: 'Bienvenue',
      home: 'Accueil',
      profile: 'Profil',
      aboutSite: 'À propos de ce site',
      snakeCaseText: "@.snakeCase:{'aboutSite'}",
      pascalCaseText: "@.pascalCase:{'aboutSite'}",
      hello: 'Bonjour le monde!',
      modifier: "@.snakeCase:{'hello'}",
      fruits: [{ name: 'pomme' }, { name: 'banane' }, { name: 'fraise' }]
    },
    en: {
      welcome: 'Welcome',
      home: 'Homepage',
      profile: 'Profile',
      hello: 'Hello world!',
      modifier: "@.snakeCase:{'hello'}",
      fallbackMessage: 'This is the fallback message!',
      fruits: [{ name: 'apple' }, { name: 'banana' }, { name: 'strawberry' }]
    },
    nl: {
      aboutSite: 'Over deze site',
      snakeCaseText: "@.snakeCase:{'aboutSite'}",
      pascalCaseText: "@.pascalCase:{'aboutSite'}",
      fruits: [{ name: 'appel' }, { name: 'banaan' }, { name: 'aardbei' }]
    }
  },
  modifiers: {
    // @ts-ignore
    snakeCase: (str: string) => str.split(' ').join('-')
  }
}))
