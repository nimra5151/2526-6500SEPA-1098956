import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./en.json";
import es from "./es.json";
import de from "./de.json";
import ur from "./ur.json";

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English", dir: "ltr" },
  { code: "es", label: "Español", dir: "ltr" },
  { code: "de", label: "Deutsch", dir: "ltr" },
  { code: "ur", label: "اردو", dir: "rtl" },
] as const;

// Map the old settings values (full names) to i18n codes
export const LANG_NAME_TO_CODE: Record<string, string> = {
  English: "en",
  Spanish: "es",
  German: "de",
  Urdu: "ur",
  en: "en",
  es: "es",
  de: "de",
  ur: "ur",
};

export const LANG_CODE_TO_NAME: Record<string, string> = {
  en: "English",
  es: "Spanish",
  de: "German",
  ur: "Urdu",
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
      de: { translation: de },
      ur: { translation: ur },
    },
    fallbackLng: "en",
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "i18nextLng",
      caches: ["localStorage"],
    },
  });

export default i18n;
