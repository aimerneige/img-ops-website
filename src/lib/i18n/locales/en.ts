import { defineLocale } from '../types';
import messages from '../en-messages';
export default defineLocale({ code: 'en', name: 'English', match: ['en'], order: 2 }, messages);
