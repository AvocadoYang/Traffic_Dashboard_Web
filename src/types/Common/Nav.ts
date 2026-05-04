export type NavItem = {
  key: string;
  label: string;
  icon?: React.ReactNode;
  children?: NavItem[];
};