// Content for the home page. Edit here; the page lays it out.

export const profile = {
  name: 'Liad Or',
  headline:
    'Electrical Engineering & Physics (Quantum Track) Undergrad | Quantum Sensing & Wave-Physics Researcher | Software & Hardware Developer',
  tagline: 'Bridging Quantum Physics, Wave Optics, and Software Engineering.',
  location: 'Ness-Ziona, Israel',
  email: 'liad101112@gmail.com',
  phone: '058-4999161',
  phoneHref: 'tel:+972584999161',
  bio: "First-year Dean's List honoree (average 96.64) and Honors Research Program graduate at Bar-Ilan University. Experienced in experimental quantum sensing, wave physics, hardware-software synchronization, and computational simulation, leveraging 5+ years of programming alongside modern AI tools (Claude, Gemini, ChatGPT) for rapid testing and development.",
};

export const stats = [
  { value: '96.64', label: "Dean's List average" },
  { value: 'Honors', label: 'Research Program graduate' },
  { value: '5+', label: 'Years programming' },
];

export interface Role {
  title: string;
  org: string;
  where: string;
  period: string;
  points: string[];
  tags: string[];
}

export const experience: Role[] = [
  {
    title: 'Junior Experimental Systems Engineer & Lab Automation',
    org: 'Quantum Sensing Lab (Dr. Yossef Panfil)',
    where: 'Bar-Ilan University',
    period: '2026 – Present',
    points: [
      'Designed optical measurement setups and synchronized laboratory devices using Python and Swabian Instruments Time Tagger hardware.',
      'Implemented ODMR for spin manipulation, Time-Correlated Single Photon Counting (TCSPC), and a 4f Confocal System for optical beam steering.',
      'Automated data acquisition, analysis, and processing using Python and MATLAB.',
    ],
    tags: ['ODMR', 'TCSPC', '4f confocal', 'Swabian Time Tagger', 'Python', 'MATLAB'],
  },
  {
    title: 'Research Intern',
    org: 'Wave-Physics Lab (Prof. Patrick Sebbah)',
    where: 'Honors Research Program',
    period: '2025 – 2026',
    points: [
      'Synchronized external hardware for two experimental systems, reducing scanning duration by 25%.',
      'Simulated systems using COMSOL Multiphysics; engineered a metamaterial plate bending waves around a diamond aperture and observed Anderson Localization.',
      'Processed and visualized datasets via Python and MATLAB in an international, English-speaking environment.',
    ],
    tags: ['COMSOL', 'Metamaterials', 'Anderson localization', 'Hardware sync', 'Python', 'MATLAB'],
  },
  {
    title: 'Electrical Control Panel Builder',
    org: 'Solar energy systems',
    where: '',
    period: '2024',
    points: ['Interpreted and assembled electrical circuit schematics for solar panel energy systems.'],
    tags: ['Schematics', 'Electrical assembly'],
  },
];

export const skills = [
  { group: 'Languages & Scripting', items: ['Python', 'MATLAB', 'C/C++', 'Java', 'Bash'] },
  {
    group: 'Hardware & Lab Systems',
    items: ['TCSPC', 'ODMR', '4f Optical Systems', 'Swabian Instruments', 'COMSOL Multiphysics', 'Hardware Synchronization'],
  },
  { group: 'Databases & Systems', items: ['MySQL', 'MongoDB', 'Redis', 'Linux', 'Windows'] },
  {
    group: 'Workflows & AI Tooling',
    items: ['Git', 'GitHub', 'GitLab', 'Gemini', 'Claude', 'ChatGPT'],
    note: 'Prompt-driven automation & rapid testing',
  },
];

export const education = [
  {
    title: 'B.Sc. in Electrical Engineering & Physics',
    detail: 'Quantum Engineering Track',
    where: 'Bar-Ilan University',
    period: '2024 – Present',
    points: ["First-Year Dean's List (96.64)", 'Honors Research Program'],
  },
  {
    title: 'Military Service',
    detail: 'Home Front Command',
    where: 'Israel Defense Forces',
    period: '2021 – 2024',
    points: [],
  },
];

export const languages = [
  { name: 'Hebrew', level: 'Native' },
  { name: 'English', level: 'Fluent' },
];
