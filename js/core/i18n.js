/**
 * Bilingual UI dictionary (English / বাংলা).
 * Assistant answers also honour this, see core/assistant.js.
 */

export const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'bn', label: 'Bangla', native: 'বাংলা' },
];

export const en = {
  'brand.tagline': "Masud's academic OS",
  'app.name': 'Academic Study Helper',
  'app.short': 'Study Helper',

  'nav.dashboard': 'Dashboard',
  'nav.routine': 'Routine',
  'nav.attendance': 'Attendance',
  'nav.tasks': 'Assignments',
  'nav.exams': 'Exams',
  'nav.study': 'Study Timer',
  'nav.notes': 'Notes',
  'nav.expenses': 'Expenses',
  'nav.skills': 'Skills',
  'nav.career': 'Career',
  'nav.learning': 'Learning Plan',
  'nav.coding': 'Coding Practice',
  'nav.calendar': 'Calendar',
  'nav.assistant': 'AI Assistant',
  'nav.analytics': 'Analytics',
  'nav.settings': 'Settings',
  'nav.academics': 'Academics',
  'nav.productivity': 'Productivity',
  'nav.growth': 'Growth',

  'action.add': 'Add',
  'action.save': 'Save',
  'action.cancel': 'Cancel',
  'action.edit': 'Edit',
  'action.delete': 'Delete',
  'action.close': 'Close',
  'action.confirm': 'Confirm',
  'action.search': 'Search',
  'action.export': 'Export JSON',
  'action.import': 'Import JSON',
  'action.reset': 'Reset data',
  'action.viewAll': 'View all',
  'action.today': 'Today',

  'common.course': 'Course',
  'common.date': 'Date',
  'common.status': 'Status',
  'common.priority': 'Priority',
  'common.title': 'Title',
  'common.description': 'Description',
  'common.notes': 'Notes',
  'common.tags': 'Tags',
  'common.total': 'Total',
  'common.present': 'Present',
  'common.absent': 'Absent',
  'common.pending': 'Pending',
  'common.completed': 'Completed',
  'common.none': 'None',
  'common.all': 'All',
  'common.optional': 'optional',
  'common.required': 'required',
  'common.loading': 'Loading…',
  'common.unassigned': 'Unassigned',
  'common.noData': 'No data yet',
  'common.streak': 'Streak',
  'common.weekly': 'Weekly',
  'common.monthly': 'Monthly',
  'common.daily': 'Daily',
};

export const bn = {
  'brand.tagline': 'মাসুদের একাডেমিক সিস্টেম',
  'app.name': 'একাডেমিক স্টাডি হেল্পার',
  'app.short': 'স্টাডি হেল্পার',

  'nav.dashboard': 'ড্যাশবোর্ড',
  'nav.routine': 'রুটিন',
  'nav.attendance': 'উপস্থিতি',
  'nav.tasks': 'অ্যাসাইনমেন্ট',
  'nav.exams': 'পরীক্ষা',
  'nav.study': 'স্টাডি টাইমার',
  'nav.notes': 'নোট',
  'nav.expenses': 'খরচ',
  'nav.skills': 'দক্ষতা',
  'nav.career': 'ক্যারিয়ার',
  'nav.learning': 'লার্নিং প্ল্যান',
  'nav.coding': 'কোডিং প্র্যাকটিস',
  'nav.calendar': 'ক্যালেন্ডার',
  'nav.assistant': 'এইচ এস সহায়ক',
  'nav.analytics': 'অ্যানালিটিক্স',
  'nav.settings': 'সেটিংস',
  'nav.academics': 'একাডেমিক',
  'nav.productivity': 'প্রোডাক্টিভিটি',
  'nav.growth': 'উন্নয়ন',

  'action.add': 'যোগ করুন',
  'action.save': 'সংরক্ষণ',
  'action.cancel': 'বাতিল',
  'action.edit': 'সম্পাদনা',
  'action.delete': 'মুছুন',
  'action.close': 'বন্ধ',
  'action.confirm': 'নিশ্চিত করুন',
  'action.search': 'খুঁজুন',
  'action.export': 'JSON এক্সপোর্ট',
  'action.import': 'JSON ইমপোর্ট',
  'action.reset': 'ডেটা রিসেট',
  'action.viewAll': 'সব দেখুন',
  'action.today': 'আজ',

  'common.course': 'কোর্স',
  'common.date': 'তারিখ',
  'common.status': 'অবস্থা',
  'common.priority': 'অগ্রাধিকার',
  'common.title': 'শিরোনাম',
  'common.description': 'বিবরণ',
  'common.notes': 'নোট',
  'common.tags': 'ট্যাগ',
  'common.total': 'মোট',
  'common.present': 'উপস্থিত',
  'common.absent': 'অনুপস্থিত',
  'common.pending': 'বাকি',
  'common.completed': 'সম্পন্ন',
  'common.none': 'নেই',
  'common.all': 'সব',
  'common.optional': 'ঐচ্ছিক',
  'common.required': 'আবশ্যক',
  'common.loading': 'লোড হচ্ছে…',
  'common.unassigned': 'নির্ধারিত নয়',
  'common.noData': 'এখনো কোনো তথ্য নেই',
  'common.streak': 'ধারাবাহিকতা',
  'common.weekly': 'সাপ্তাহিক',
  'common.monthly': 'মাসিক',
  'common.daily': 'দৈনিক',
};


/* ------------------------------------------------------------------ runtime */

let current = 'en';

const cache = { en: new Map(Object.entries(en)), bn: new Map(Object.entries(bn)) };

/** Translate a key for a language (default: the active one). */
export function t(key, language = current) {
  const lang = cache[language] ? language : 'en';
  return cache[lang].get(key) ?? en[key] ?? key;
}

export function getLanguage() {
  return current;
}

export function setLanguage(code) {
  current = cache[code] ? code : 'en';
  return current;
}

/** Apply translations to any element carrying data-i18n / data-i18n-title. */
export function applyDom(scope = document) {
  for (const node of scope.querySelectorAll('[data-i18n]')) {
    node.textContent = t(node.dataset.i18n);
  }
  for (const node of scope.querySelectorAll('[data-i18n-title]')) {
    node.title = t(node.dataset.i18nTitle);
  }
  for (const node of scope.querySelectorAll('[data-i18n-placeholder]')) {
    node.placeholder = t(node.dataset.i18nPlaceholder);
  }
  document.documentElement.lang = current;
}
