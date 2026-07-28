export interface LinkItem {
  label: string;
  href: string;
}

export interface WorkflowStep {
  number: string;
  title: string;
  body: string;
  compactTitle: string;
  compactBody: string;
  detail: string;
}

export interface RolePanel {
  id: 'member' | 'manager' | 'admin';
  label: string;
  eyebrow: string;
  title: string;
  points: string[];
  variant: 'member' | 'manager' | 'admin';
  selectedByDefault?: boolean;
}

export interface ScopeCard {
  eyebrow: string;
  title: string;
  body: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export const navigation: LinkItem[] = [
  { label: 'Product', href: '#product' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'FAQ', href: '#faq' },
];

export const workflowSteps: WorkflowStep[] = [
  {
    number: '01 · ISSUE',
    title: 'Bring the work into focus.',
    body: 'Start with a GitHub issue or a local task, so time begins with the context the team already understands.',
    compactTitle: 'Start from the work.',
    compactBody: 'Open a supported GitHub issue or choose any manual task from the workspace.',
    detail: 'Repository, project and issue context stay attached.',
  },
  {
    number: '02 · TIMER',
    title: 'Track without re-entering work.',
    body: 'Run a timer from the extension or workspace, then keep manual work and synced tasks in one reliable timeline.',
    compactTitle: 'Track with context.',
    compactBody: 'Keep the task, project, client, and source link visible while work is in progress.',
    detail: 'Accurate time follows the task instead of a separate sheet.',
  },
  {
    number: '03 · REVIEW',
    title: 'Make review the natural next step.',
    body: 'Hours remain ready for the right people to review, filter and move forward when the work is ready to bill.',
    compactTitle: 'Review with confidence.',
    compactBody: 'Close the loop with time records that are already connected to the work they describe.',
    detail: 'Clear records replace status-chasing.',
  },
];

export const roles: RolePanel[] = [
  {
    id: 'member',
    label: 'Member',
    eyebrow: 'MEMBER VIEW',
    title: 'Track time and manage your own entries.',
    points: [
      'Work with visible projects and tasks',
      'Connect GitHub when you need it',
    ],
    variant: 'member',
    selectedByDefault: true,
  },
  {
    id: 'manager',
    label: 'Project Manager',
    eyebrow: 'PROJECT MANAGER VIEW',
    title: 'See delivery clearly, without chasing time sheets.',
    points: [
      'See live time across assigned projects before work reaches reporting.',
      'Filter tracked hours by project, member and date range in one place.',
      'Move accurate entries into invoice records when the work is ready to bill.',
    ],
    variant: 'manager',
  },
  {
    id: 'admin',
    label: 'Admin',
    eyebrow: 'RUN THE WORKSPACE',
    title: 'Admin',
    points: [
      'Invite teammates and assign roles',
      'Manage settings and GitHub connection',
      'See the full workspace across projects',
    ],
    variant: 'admin',
  },
];

export const scopeCards: ScopeCard[] = [
  {
    eyebrow: 'GITHUB IS OPTIONAL',
    title: 'Connect context when it helps.',
    body: 'Members can sign in with Google or email, then connect GitHub only for the repositories, projects and issues they want to sync.',
  },
  {
    eyebrow: 'MANUAL MODE',
    title: 'Keep non-GitHub work in the same picture.',
    body: 'Create local projects and tasks, then report on them beside synced GitHub work.',
  },
  {
    eyebrow: 'WEB + EXTENSION',
    title: 'Start where work happens.',
    body: 'Use the web workspace or the browser extension without changing the tracking model.',
  },
];

export const faqs: FaqItem[] = [
  {
    question: 'Do I need GitHub to use GITiempo?',
    answer:
      'No. Create local projects and tasks, then connect GitHub only when synced issue context helps.',
  },
  {
    question: 'Can I start timers from GitHub?',
    answer:
      'Yes. After signing in to the Chrome extension, supported GitHub issue pages can start a timer with repository and issue context attached.',
  },
  {
    question: 'Who can review tracked time?',
    answer:
      'Members manage their own entries. Project managers and admins review time according to their workspace role and project visibility.',
  },
  {
    question: 'Where do reports and invoice records fit?',
    answer:
      'Approved time stays available for filtering and reporting, then can continue into invoice records when the work is ready to bill.',
  },
];
