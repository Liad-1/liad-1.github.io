// Letters of recommendation, certificates and awards shown on /letters.
//
// To add a new one:
//   1. Put the file in public/letters/ (a PDF, or a JPG/PNG for scans).
//   2. Make a preview image of the first page, about 720px tall, named
//      <name>-thumb.jpg (on macOS: sips -s format jpeg -Z 720 file.pdf --out file-thumb.jpg).
//   3. Add an entry below. The page groups entries by `category` and sorts
//      them newest first, so order here doesn't matter.
//
// Before publishing a document, check it for ID numbers, phone numbers or
// other personal details and redact them first.

export type LetterCategory = 'recommendation' | 'award';

export interface Letter {
  /** Short unique id, used as the card's anchor (/letters#<id>). */
  id: string;
  category: LetterCategory;
  title: string;
  /** Who wrote or issued it. */
  author: string;
  /** Their role and institution. */
  role: string;
  /** ISO date (YYYY-MM-DD), used for sorting. */
  date: string;
  /** How the date is shown, e.g. 'Nov 2026' or '2024–25 academic year'. */
  dateLabel: string;
  language: 'English' | 'Hebrew';
  /** One or two sentences in English describing the document. */
  summary: string;
  /** A short quote from the letter (optional). */
  quote?: string;
  /** Path under public/, e.g. '/letters/foo.pdf'. */
  file: string;
  /** Path under public/ to the preview image. */
  thumb: string;
  pages?: number;
  /**
   * Move a document to the collapsed Archive at the bottom of the page,
   * e.g. when the details in it are out of date. Explain why in `archiveNote`.
   */
  archived?: boolean;
  archiveNote?: string;
}

export const categories: { id: LetterCategory; title: string; blurb: string }[] = [
  {
    id: 'recommendation',
    title: 'Letters of Recommendation',
    blurb: 'Written by faculty, research supervisors and high-school teachers.',
  },
  {
    id: 'award',
    title: 'Awards & Certificates',
    blurb: 'Academic honors and distinctions.',
  },
];

export const letters: Letter[] = [
  {
    id: 'sebbah-2026',
    category: 'recommendation',
    title: 'Letter of Recommendation',
    author: 'Prof. Patrick Sebbah',
    role: 'Mesoscopic Optics & Complex Media Group, Dept. of Physics, Bar-Ilan University',
    date: '2026-11-03',
    dateLabel: 'Nov 2026',
    language: 'English',
    summary:
      'From my research supervisor, covering two wave-physics projects: dynamic cloaking in an elastic plate and Anderson localization in a tube system, including the simulations, setup automation and VNA programming I did for them.',
    quote:
      'He is resourceful, learns quickly, and does not hesitate to explore technical solutions on his own.',
    file: '/letters/sebbah-recommendation-2026.pdf',
    thumb: '/letters/sebbah-recommendation-2026-thumb.jpg',
    pages: 2,
  },
  {
    id: 'shefi-2025',
    category: 'recommendation',
    title: 'Scholarship Recommendation, Ministry of Energy & Infrastructure',
    author: 'Prof. Orit Shefi',
    role: 'Dean, Alexander Kofkin Faculty of Engineering, Bar-Ilan University',
    date: '2025-11-02',
    dateLabel: 'Nov 2025',
    language: 'Hebrew',
    summary:
      "The Dean's recommendation for the Ministry of Energy and Infrastructure scholarship. It covers my first-year academic record in the Physics & Electrical Engineering (Quantum Engineering) program, my role as representatives coordinator in the Student Union, and my military service.",
    quote: 'A most worthy candidate, representing the kind of outstanding graduates we strive to educate.',
    file: '/letters/shefi-energy-ministry-2025.pdf',
    thumb: '/letters/shefi-energy-ministry-2025-thumb.jpg',
    pages: 1,
    archived: true,
    archiveNote:
      'Written before my first-year grades were finalized. It cites an average of 94.9; my final first-year average is 96.64.',
  },
  {
    id: 'bernstein-2021',
    category: 'recommendation',
    title: 'Letter of Recommendation',
    author: 'Dana Bernstein',
    role: 'Mathematics Teacher, Science Park High School, Ness Ziona',
    date: '2021-08-02',
    dateLabel: 'Aug 2021',
    language: 'Hebrew',
    summary:
      'From my 11th-grade math teacher, who prepared me for the 5-unit math matriculation exam (final grade: 95). Written for the IDF ahead of my military service.',
    quote:
      'He stood out for his drive to understand every concept in depth and his ability to explain what he understood to the rest of the class.',
    file: '/letters/bernstein-math-2021.pdf',
    thumb: '/letters/bernstein-math-2021-thumb.jpg',
    pages: 1,
  },
  {
    id: 'ran-2020',
    category: 'recommendation',
    title: 'Letter of Recommendation',
    author: 'Yeela Ran',
    role: 'Homeroom Teacher, Science Park Education Campus, Ness Ziona',
    date: '2020-12-27',
    dateLabel: 'Dec 2020',
    language: 'Hebrew',
    summary:
      'From my homeroom teacher of three years (2018–2021) in the honors medical-sciences track. It covers my character and academic record, and my volunteering as a flutist at school ceremonies.',
    quote: 'An intelligent, curious student with very good achievements.',
    file: '/letters/ran-homeroom-2020.pdf',
    thumb: '/letters/ran-homeroom-2020-thumb.jpg',
    pages: 1,
  },
  {
    id: 'deans-list-2025',
    category: 'award',
    title: "Dean's List Certificate",
    author: 'Prof. Orit Shefi',
    role: 'Dean, Faculty of Engineering, Bar-Ilan University',
    date: '2025-07-01',
    dateLabel: '2024–25 academic year',
    language: 'Hebrew',
    summary:
      "Certificate of Excellence: Dean's List for the 2024–25 academic year, Electrical Engineering track, Faculty of Engineering.",
    file: '/letters/deans-list-2025.jpg',
    thumb: '/letters/deans-list-2025-thumb.jpg',
  },
];
