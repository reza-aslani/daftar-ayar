export type SearchPerson = {
  id: string;
  code: number;
  title: string;
  phone: string;
  mobile: string;
  group: string;
  groupLabel: string;
  active: boolean;
};

export type SearchDocument = {
  id: string;
  number: number;
  href: string;
  title: string;
  hint: string;
};
