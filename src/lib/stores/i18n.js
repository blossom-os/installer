import { writable } from 'svelte/store';

// Get initial language from localStorage or default to 'en'
function getStoredLanguage() {
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem('installer-language') || 'en';
  }
  return 'en';
}

// Get initial keyboard from localStorage or default to 'us'
function getStoredKeyboard() {
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem('installer-keyboard') || 'us';
  }
  return 'us';
}

// Current language code with persistence
export const currentLanguage = writable(getStoredLanguage());

// Current keyboard layout with persistence
export const currentKeyboard = writable(getStoredKeyboard());

// Loaded translations
export const translations = writable(null);

// Available languages
export const availableLanguages = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' }
];

// Subscribe to language changes to save to localStorage
currentLanguage.subscribe((lang) => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('installer-language', lang);
  }
});

// Subscribe to keyboard changes to save to localStorage
currentKeyboard.subscribe((keyboard) => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('installer-keyboard', keyboard);
  }
});

// Load translations for the given language
export async function loadLanguageTranslations(languageCode) {
  try {
    if (typeof window !== 'undefined' && window.installer?.loadTranslations) {
      const t = await window.installer.loadTranslations(languageCode);
      translations.set(t);
      currentLanguage.set(languageCode);
      return t;
    }
    
    // Fallback for when window.installer is not available
    const response = await fetch(`/locales/${languageCode}.json`);
    if (!response.ok) throw new Error('Failed to load translations');
    const t = await response.json();
    translations.set(t);
    currentLanguage.set(languageCode);
    return t;
  } catch (error) {
    console.error('Error loading translations:', error);
    // Load English as fallback
    try {
      const response = await fetch('/locales/en.json');
      const t = await response.json();
      translations.set(t);
      currentLanguage.set('en');
      return t;
    } catch (fallbackError) {
      console.error('Error loading fallback translations:', fallbackError);
      return null;
    }
  }
}

// Set language and persist it
export function setLanguage(languageCode) {
  currentLanguage.set(languageCode);
}

// Set keyboard and persist it
export function setKeyboard(keyboardCode) {
  currentKeyboard.set(keyboardCode);
}

// Get current language
export function getCurrentLanguage() {
  return getStoredLanguage();
}

// Get current keyboard
export function getCurrentKeyboard() {
  return getStoredKeyboard();
}