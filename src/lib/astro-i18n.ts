/**
 * Life Rhythm — interface translations (navigation, section names, buttons, form labels).
 * English is the source; long-form readings are currently written in English.
 */
export type Lang = 'en' | 'de' | 'hi';

export const LANGS: Array<{ id: Lang; label: string }> = [
  { id: 'en', label: 'English' },
  { id: 'de', label: 'Deutsch' },
  { id: 'hi', label: 'हिन्दी' },
];

const DICT: Record<string, { de: string; hi: string }> = {
  // Tabs
  Today: { de: 'Heute', hi: 'आज' },
  You: { de: 'Sie', hi: 'आप' },
  'Your seasons': { de: 'Ihre Lebensphasen', hi: 'आपके जीवन-चरण' },
  People: { de: 'Menschen', hi: 'संबंध' },
  Decisions: { de: 'Entscheidungen', hi: 'निर्णय' },
  'Chart data': { de: 'Horoskopdaten', hi: 'कुंडली डेटा' },
  // Mode + header
  Simple: { de: 'Einfach', hi: 'सरल' },
  'Pro detail': { de: 'Profi-Details', hi: 'विस्तृत' },
  'Edit details': { de: 'Angaben ändern', hi: 'विवरण बदलें' },
  'Download report (PDF)': { de: 'Bericht herunterladen (PDF)', hi: 'रिपोर्ट डाउनलोड (PDF)' },
  'Add someone': { de: 'Person hinzufügen', hi: 'व्यक्ति जोड़ें' },
  Profile: { de: 'Profil', hi: 'प्रोफ़ाइल' },
  // Sub-navigation
  'Best hours': { de: 'Beste Stunden', hi: 'शुभ समय' },
  'Coming up': { de: 'Demnächst', hi: 'आगे क्या' },
  Travel: { de: 'Reisen', hi: 'यात्रा' },
  'Reset plan': { de: 'Reset-Plan', hi: 'रीसेट योजना' },
  'How you work': { de: 'Wie Sie arbeiten', hi: 'आपकी कार्यशैली' },
  Strengths: { de: 'Stärken', hi: 'शक्तियाँ' },
  'Daily routine': { de: 'Tagesrhythmus', hi: 'दिनचर्या' },
  'Work & money': { de: 'Beruf & Geld', hi: 'करियर और धन' },
  'Health & energy': { de: 'Gesundheit & Energie', hi: 'स्वास्थ्य और ऊर्जा' },
  'Home & growth': { de: 'Zuhause & Wachstum', hi: 'घर और विकास' },
  'This chapter': { de: 'Dieses Kapitel', hi: 'वर्तमान अध्याय' },
  'This year': { de: 'Dieses Jahr', hi: 'यह वर्ष' },
  'Year chart': { de: 'Jahreshoroskop', hi: 'वर्षफल' },
  'Life map': { de: 'Lebenskarte', hi: 'जीवन मानचित्र' },
  'Long cycles': { de: 'Lange Zyklen', hi: 'दीर्घ चक्र' },
  'Other systems': { de: 'Weitere Systeme', hi: 'अन्य दशा प्रणालियाँ' },
  Partner: { de: 'Partner', hi: 'जीवनसाथी' },
  Children: { de: 'Kinder', hi: 'संतान' },
  'Ask a question': { de: 'Frage stellen', hi: 'प्रश्न पूछें' },
  'Check a decision': { de: 'Entscheidung prüfen', hi: 'निर्णय जाँचें' },
  'Find a good date': { de: 'Guten Termin finden', hi: 'शुभ मुहूर्त खोजें' },
  // Intake
  'What should we call you?': { de: 'Wie dürfen wir Sie nennen?', hi: 'हम आपको क्या कहें?' },
  'Date of birth': { de: 'Geburtsdatum', hi: 'जन्म तिथि' },
  'Time of birth': { de: 'Geburtszeit', hi: 'जन्म समय' },
  'Place of birth': { de: 'Geburtsort', hi: 'जन्म स्थान' },
  'Show my rhythm': { de: 'Meinen Rhythmus zeigen', hi: 'मेरी लय दिखाएँ' },
  'I don’t know it': { de: 'Unbekannt', hi: 'मालूम नहीं' },
  'Use an example': { de: 'Beispiel verwenden', hi: 'उदाहरण देखें' },
  'Book a consultation': { de: 'Beratung buchen', hi: 'परामर्श बुक करें' },
  'Readings are written in English for now.': { de: 'Die Deutungen sind derzeit auf Englisch.', hi: 'विस्तृत विवरण अभी अंग्रेज़ी में हैं।' },
};

export function t(key: string, lang: Lang): string {
  if (lang === 'en') return key;
  return DICT[key]?.[lang] ?? key;
}
