import React, { createContext, useContext, useState } from 'react';
import translations from '../lib/translations';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState('mr'); // Marathi default

  const t = (key) => {
    const entry = translations[key];
    if (!entry) return key;
    return entry[lang] || entry['en'] || key;
  };

  const toggleLanguage = () => {
    setLang(prev => prev === 'mr' ? 'en' : 'mr');
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}
