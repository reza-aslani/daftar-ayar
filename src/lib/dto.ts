export type AccountOption = {
  id: string;
  code: number;
  title: string;
  group: string;
  groupLabel: string;
};

export type StockPiece = {
  id: string;
  code: number;
  codeLabel: string;
  kind: "MOTAFARREQE" | "ABSHODE";
  kindLabel: string;
  scale: string;
  weight750: string;
  ayar: string;
  conditional: boolean;
  pending: boolean;
  stale: boolean;
  ang: string;
  ageDays: number;
};

export type CoinOption = {
  id: string;
  name: string;
  buy: string;
  sell: string;
  stock: number;
};

export type DeskData = {
  today: string;
  todayLabel: string;
  mazane: { mesghal: string; gram: string; date: string } | null;
  defaultAyar: string;
  standardAyar: string;
  mesghalGrams: string;
  mesghalAyar: string;
  accounts: AccountOption[];
  pieces: StockPiece[];
  coins: CoinOption[];
  labs: { id: string; name: string }[];
  banks: AccountOption[];
  expenseAccounts: AccountOption[];
};

export type AssayOut = {
  key: string;
  scale: string;
  booked750: string;
  accountName: string;
};

export type PendingPiece = {
  id: string;
  code: number;
  codeLabel: string;
  kindLabel: string;
  scale: string;
  original750: string;
  received: string;
  sourceName: string;
  originAffectsGram: boolean;
  originKey: string;
  outs: AssayOut[];
  ang: string;
  envelopeNo: string;
  labId: string;
};
