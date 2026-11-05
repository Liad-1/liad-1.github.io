// Site-wide settings. Edit these first.
export const SITE_TITLE = 'Liad Or';
export const SITE_DESCRIPTION =
  'Liad Or: Electrical Engineering & Physics (Quantum Track) undergrad at Bar-Ilan University, quantum sensing and wave-physics researcher, and software developer.';

export const GITHUB_URL = 'https://github.com/Liad-1';

// Set these to show the LinkedIn link and the resume download button.
// RESUME_PATH is a file in public/, e.g. '/Liad-Or-Resume.pdf'.
export const LINKEDIN_URL = '';
export const RESUME_PATH = '';

// Links starting with '/#' scroll to a section of the home page.
export const NAV_LINKS = [
  { href: '/#research', label: 'Research' },
  { href: '/#skills', label: 'Skills' },
  { href: '/#projects', label: 'Projects' },
  { href: '/#education', label: 'Education' },
  { href: '/#contact', label: 'Contact' },
] as const;
