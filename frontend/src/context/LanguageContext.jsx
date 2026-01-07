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
      leaderboard: 'Leaderboard',
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
    },
    leaderboard: {
      title: 'Leaderboard',
      subtitle: 'Top performers ranked by experience points',
      loading: 'Loading leaderboard...',
      tryAgain: 'Try Again',
      noRankings: 'No rankings yet',
      noRankingsDesc: 'Be the first to earn XP and claim the top spot!',
      level: 'Level'
    },
    questions: {
      chooseMode: 'Choose Quiz Mode',
      selectMode: 'Select mode and optionally filter by tags',
      quizMode: 'Quiz Mode',
      unsolvedQuestions: 'Unsolved Questions',
      unsolvedDesc: 'Practice questions you haven\'t answered yet',
      allQuestions: 'All Questions',
      allDesc: 'Practice all available questions',
      randomQuestions: 'Random Questions',
      randomDesc: 'Get 50 random questions for quick practice',
      filterByTags: 'Filter by Tags',
      selectTag: 'Select a tag to filter questions',
      allTopics: 'All Topics',
      startQuiz: 'Start Quiz',
      selectModeFirst: 'Please select a quiz mode first',
      selectTagFirst: 'Please select a tag for this mode'
    },
    progress: {
      title: 'Your Progress',
      loading: 'Loading your progress...',
      currentLevel: 'Current Level',
      progressToLevel: 'Progress to Level',
      xpRemaining: 'remaining',
      questionsSolved: 'Questions Solved',
      simulations: 'Simulations',
      progressByCategory: 'Progress by Category',
      recentSimulations: 'Recent Simulations',
      passed: 'Passed',
      failed: 'Failed',
      points: 'points',
      correctAnswers: 'correct answers'
    },
    hero: {
      title: 'Learn Applied Informatics',
      subtitle: 'Practice computer science fundamentals through interactive questions and curated learning resources',
      browseQuestions: 'Browse Questions',
      browseResources: 'Browse Resources',
      practiceQuestions: 'Practice Questions',
      activeLearners: 'Active Learners',
      learningResources: 'Learning Resources',
      startHere: 'Start Here',
      linuxRoadmap: 'Linux Roadmap',
      networkRoadmap: 'Network Roadmap',
      easyExam: 'Easy Exam',
      mediumExam: 'Medium Exam',
      newExams: 'New Exams',
      benefitsTitle: 'Benefits of Creating an Account',
      guest: 'Guest',
      user: 'User',
      accessQuestions: 'Access to all questions',
      accessResources: 'Access to all resources',
      trackProgress: 'Track progress',
      betterExams: 'Better exam sessions',
      dailyChallenge: 'Access to daily challenges',
      registerNow: 'Register Now'
    }
  },
  ro: {
    navbar: {
      home: 'Acasă',
      questions: 'Întrebări',
      resources: 'Resurse',
      progress: 'Progres',
      leaderboard: 'Clasament',
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
    },
    leaderboard: {
      title: 'Clasament',
      subtitle: 'Cei mai buni performeri clasați după punctele de experiență',
      loading: 'Se încarcă clasamentul...',
      tryAgain: 'Încearcă din nou',
      noRankings: 'Încă nu există clasamente',
      noRankingsDesc: 'Fii primul care câștigă XP și revendică primul loc!',
      level: 'Nivel'
    },
    questions: {
      chooseMode: 'Alege Modul de Quiz',
      selectMode: 'Selectează modul și opțional filtrează după etichete',
      quizMode: 'Mod Quiz',
      unsolvedQuestions: 'Întrebări Nerezolvate',
      unsolvedDesc: 'Exersează întrebările la care nu ai răspuns încă',
      allQuestions: 'Toate Întrebările',
      allDesc: 'Exersează toate întrebările disponibile',
      randomQuestions: 'Întrebări Aleatorii',
      randomDesc: 'Obține 50 de întrebări aleatorii pentru practică rapidă',
      filterByTags: 'Filtrează după Etichete',
      selectTag: 'Selectează o etichetă pentru a filtra întrebările',
      allTopics: 'Toate Subiectele',
      startQuiz: 'Începe Quiz-ul',
      selectModeFirst: 'Te rugăm să selectezi mai întâi un mod de quiz',
      selectTagFirst: 'Te rugăm să selectezi o etichetă pentru acest mod'
    },
    progress: {
      title: 'Progresul Tău',
      loading: 'Se încarcă progresul...',
      currentLevel: 'Nivelul Curent',
      progressToLevel: 'Progres către Nivelul',
      xpRemaining: 'rămas',
      questionsSolved: 'Întrebări Rezolvate',
      simulations: 'Simulări',
      progressByCategory: 'Progres pe Categorii',
      recentSimulations: 'Simulări Recente',
      passed: 'Promovat',
      failed: 'Respins',
      points: 'puncte',
      correctAnswers: 'răspunsuri corecte'
    },
    hero: {
      title: 'Învață Informatica Aplicată',
      subtitle: 'Exersează fundamentele informaticii prin întrebări interactive și resurse de învățare',
      browseQuestions: 'Răsfoiește Întrebările',
      browseResources: 'Răsfoiește Resursele',
      practiceQuestions: 'Întrebări de Practică',
      activeLearners: 'Cursanți Activi',
      learningResources: 'Resurse de Învățare',
      startHere: 'Începe Aici',
      linuxRoadmap: 'Plan Linux',
      networkRoadmap: 'Plan Rețele',
      easyExam: 'Examen Ușor',
      mediumExam: 'Examen Mediu',
      newExams: 'Examene Noi',
      benefitsTitle: 'Beneficiile Creării unui Cont',
      guest: 'Vizitator',
      user: 'Utilizator',
      accessQuestions: 'Acces la toate întrebările',
      accessResources: 'Acces la toate resursele',
      trackProgress: 'Urmărire progres',
      betterExams: 'Sesiuni de examen îmbunătățite',
      dailyChallenge: 'Acces la provocări zilnice',
      registerNow: 'Înregistrează-te Acum'
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