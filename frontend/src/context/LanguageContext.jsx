import { createContext, useState, useContext } from 'react';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

const translations = {
  en: {
    navbar: {
      home: 'Home',
      questions: 'Questions',
      resources: 'Resources',
      progress: 'Progress',
      login: 'Login',
      register: 'Register',
      logout: 'Logout'
    },
    footer: {
      description: 'Your comprehensive platform for mastering applied informatics through interactive learning and practice.',
      learn: 'Learn',
      questions: 'Questions',
      resources: 'Resources',
      progress: 'Progress',
      links: 'LINKS',
      updates: 'Updates',
      rights: 'All rights reserved.',
      version: 'Version:'
    },
    updates: {
      title: 'Updates & Changelog',
      subtitle: 'Stay up to date with the latest features, improvements, and bug fixes',
      newFeatures: 'New Features',
      improvements: 'Improvements',
      bugFixes: 'Bug Fixes',
      version: 'Version',
      updatesPage: 'Updates Page'
    },
    resources: {
      title: 'Learning Resources',
      subtitle: 'Comprehensive materials to enhance your learning experience',
      dictionary: 'Dictionary',
      roadmaps: 'Roadmaps',
      searchPlaceholder: 'Search resources...',
      noResults: 'No resources found matching your search.',
      viewRoadmap: 'View Roadmap'
    },
    login: {
      title: 'Welcome Back',
      subtitle: 'Sign in to continue your learning journey',
      email: 'Email',
      password: 'Password',
      emailPlaceholder: 'your@email.com',
      passwordPlaceholder: 'Enter your password',
      signIn: 'Sign In',
      or: 'or',
      noAccount: "Don't have an account?",
      signUp: 'Sign up'
    },
    register: {
      title: 'Join NET2077',
      subtitle: 'Create your account and start learning today',
      username: 'Username',
      email: 'Email',
      password: 'Password',
      confirmPassword: 'Confirm Password',
      usernamePlaceholder: 'Choose a username',
      emailPlaceholder: 'your@email.com',
      passwordPlaceholder: 'Create a strong password',
      confirmPasswordPlaceholder: 'Confirm your password',
      createAccount: 'Create Account',
      or: 'or',
      haveAccount: 'Already have an account?',
      signIn: 'Sign in',
      passwordRequirement: 'Password must be at least 6 characters',
      passwordMismatch: 'Passwords do not match'
    }
  },
  ro: {
    navbar: {
      home: 'Acasă',
      questions: 'Întrebări',
      resources: 'Resurse',
      progress: 'Progres',
      login: 'Conectare',
      register: 'Înregistrare',
      logout: 'Deconectare'
    },
    footer: {
      description: 'Platforma ta completă pentru stăpânirea informaticii aplicate prin învățare interactivă și practică.',
      learn: 'Învață',
      questions: 'Întrebări',
      resources: 'Resurse',
      progress: 'Progres',
      links: 'LINKURI',
      updates: 'Actualizări',
      rights: 'Toate drepturile rezervate.',
      version: 'Versiunea:'
    },
    updates: {
      title: 'Actualizări & Istoric Modificări',
      subtitle: 'Rămâi la curent cu cele mai noi funcționalități, îmbunătățiri și corecturi',
      newFeatures: 'Funcționalități Noi',
      improvements: 'Îmbunătățiri',
      bugFixes: 'Corecturi Erori',
      version: 'Versiunea',
      updatesPage: 'Pagina Actualizări'
    },
    resources: {
      title: 'Resurse de Învățare',
      subtitle: 'Materiale complete pentru a-ți îmbunătăți experiența de învățare',
      dictionary: 'Dicționar',
      roadmaps: 'Planuri de Învățare',
      searchPlaceholder: 'Caută resurse...',
      noResults: 'Nu s-au găsit resurse care să corespundă căutării.',
      viewRoadmap: 'Vezi Planul'
    },
    login: {
      title: 'Bine ai revenit',
      subtitle: 'Conectează-te pentru a-ți continua călătoria de învățare',
      email: 'Email',
      password: 'Parolă',
      emailPlaceholder: 'email@exemplu.com',
      passwordPlaceholder: 'Introdu parola',
      signIn: 'Conectare',
      or: 'sau',
      noAccount: 'Nu ai cont?',
      signUp: 'Înregistrează-te'
    },
    register: {
      title: 'Alătură-te NET2077',
      subtitle: 'Creează-ți contul și începe să înveți astăzi',
      username: 'Nume utilizator',
      email: 'Email',
      password: 'Parolă',
      confirmPassword: 'Confirmă Parola',
      usernamePlaceholder: 'Alege un nume de utilizator',
      emailPlaceholder: 'email@exemplu.com',
      passwordPlaceholder: 'Creează o parolă puternică',
      confirmPasswordPlaceholder: 'Confirmă parola',
      createAccount: 'Creează Cont',
      or: 'sau',
      haveAccount: 'Ai deja cont?',
      signIn: 'Conectează-te',
      passwordRequirement: 'Parola trebuie să aibă cel puțin 6 caractere',
      passwordMismatch: 'Parolele nu se potrivesc'
    }
  }
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('en');

  const t = (key) => {
    const keys = key.split('.');
    let value = translations[language];
    
    for (const k of keys) {
      value = value?.[k];
    }
    
    return value || key;
  };

  const changeLanguage = (lang) => {
    setLanguage(lang);
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};