
export type MeldeFachfrageUi = {
  id: string;
  frage: string;
  optionen: Array<{
    value: string;
    label: string;
    hint?: string;
    icon?: string;
  }>;
};
