import 'i18next';
import translateEN from '../i18n/languages/en/translation.json';
import translateTW from '../i18n/languages/tw/translation.json';
// import resources from './resources';
type ENType = typeof translateEN;
type TWType = typeof translateTW;

declare module 'i18next' {
  // Extend CustomTypeOptions
  interface CustomTypeOptions {
    // custom namespace type, if you changed it
    defaultNS: 'en';
    // custom resources type
    resources: {
      en: typeof translateEN;
      tw: typeof translateTW;
    };
    // other
  }
}
