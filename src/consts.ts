// Site-wide settings. Edit these first.
export const SITE_TITLE = 'Your Name';
export const SITE_DESCRIPTION = 'Personal website of Your Name: projects, writing, and more.';

export const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/projects', label: 'Projects' },
  { href: '/blog', label: 'Blog' },
] as const;

export const SOCIAL_LINKS = [
  { href: 'https://github.com/your-username', label: 'GitHub' },
  { href: 'https://www.linkedin.com/in/your-username', label: 'LinkedIn' },
  { href: 'mailto:you@example.com', label: 'Email' },
] as const;
