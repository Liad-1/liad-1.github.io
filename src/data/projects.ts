export interface Project {
  title: string;
  description: string;
  tags: string[];
  repo: string;
  url?: string;
  /** Path to an in-browser demo; shows a Launch button. */
  demo?: string;
}

export const projects: Project[] = [
  {
    title: 'Quicksort Graphics (C)',
    description:
      'A real-time visualization of quicksort written in C. A sorting thread rearranges 100 values while an OpenGL/GLFW window draws each step as bars.',
    tags: ['C', 'OpenGL', 'GLFW', 'pthreads'],
    repo: 'https://github.com/Liad-1/quicksort-graphics-C',
    demo: '/demos/quicksort/index.html',
  },
];
