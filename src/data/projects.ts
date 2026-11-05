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
  {
    title: 'Pathfinder (C++)',
    description:
      "Generates a random maze with a randomized depth-first search, then solves it step by step with A* and Dijkstra's algorithm, drawn live with OpenGL/GLFW.",
    tags: ['C++', 'OpenGL', 'GLFW', 'Threads'],
    repo: 'https://github.com/Liad-1/Pathfinder',
    demo: '/demos/pathfinder/index.html',
  },
  {
    title: 'Binary Tree (Java)',
    description:
      'An interactive binary search tree: insert and remove values, print pre-, in- and post-order traversals, and see the whole tree drawn as ASCII art after every change.',
    tags: ['Java', 'Data structures', 'TeaVM'],
    repo: 'https://github.com/Liad-1/binarytree',
    demo: '/demos/binarytree/index.html',
  },
  {
    title: 'Minesweeper (Python)',
    description:
      'Classic Minesweeper built with pygame: a main menu, a safe first click, flags, a timer and mine counter, and an in-game settings screen for board size and mine density.',
    tags: ['Python', 'pygame', 'pygbag'],
    repo: 'https://github.com/Liad-1/Minesweeper',
    demo: '/demos/minesweeper/index.html',
  },
];
