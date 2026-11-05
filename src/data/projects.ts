export interface Project {
  title: string;
  description: string;
  tags: string[];
  url?: string;
  repo?: string;
}

// Replace these placeholders with your own projects.
export const projects: Project[] = [
  {
    title: 'Personal Website',
    description: 'This site, built with Astro and deployed as static HTML.',
    tags: ['Astro', 'TypeScript', 'CSS'],
    repo: 'https://github.com/your-username/personal-website',
  },
  {
    title: 'Project Two',
    description: 'A short description of what this project does and why it matters.',
    tags: ['Python'],
    url: 'https://example.com',
  },
];
