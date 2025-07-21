import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import resources from '../@type/resource';

void i18next.use(initReactI18next).init({
  lng: 'tw', // if you're using a language detector, do not define the lng option
  debug: false,
  resources
});
