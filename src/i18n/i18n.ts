import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import resources from "../@type/resource";

void i18next.use(initReactI18next).init({
  lng: "tw", // if you're using a language detector, do not define the lng option
  debug: false,
  // React 本身就會跳脫輸出,i18next 再跳一次會把 "/" 之類的字元變成 &#x2F;
  interpolation: { escapeValue: false },
  resources,
});
