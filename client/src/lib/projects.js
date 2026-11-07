// Shared labels for the Project Hub.

export const CATEGORIES = [
  { id: 'web', label: 'Web', icon: 'bi-globe2' },
  { id: 'ai-ml', label: 'AI / ML', icon: 'bi-cpu' },
  { id: 'dsa', label: 'DSA', icon: 'bi-diagram-3' },
  { id: 'mobile', label: 'Mobile', icon: 'bi-phone' },
  { id: 'cloud-devops', label: 'Cloud / DevOps', icon: 'bi-cloud' },
  { id: 'open-source', label: 'Open Source', icon: 'bi-github' },
  { id: 'data', label: 'Data', icon: 'bi-bar-chart' },
  { id: 'iot', label: 'IoT / Hardware', icon: 'bi-cpu-fill' },
  { id: 'other', label: 'Other', icon: 'bi-grid' },
];

export const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

export const STATUS = {
  draft: { label: 'Draft', tone: 'gray', icon: 'bi-pencil' },
  pending_review: { label: 'In review', tone: 'amber', icon: 'bi-hourglass-split' },
  changes_requested: { label: 'Changes requested', tone: 'red', icon: 'bi-exclamation-circle' },
  published: { label: 'Published', tone: 'green', icon: 'bi-check-circle-fill' },
  rejected: { label: 'Not accepted', tone: 'red', icon: 'bi-x-circle' },
  archived: { label: 'Unpublished', tone: 'gray', icon: 'bi-archive' },
};

export const categoryOf = (id) => CATEGORIES.find((c) => c.id === id) || CATEGORIES[CATEGORIES.length - 1];
