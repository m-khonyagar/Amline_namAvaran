import type { ContractType, PRContractStep } from '../types/wizard';

export interface DraftEntry {
  contractId: string;
  contractType: ContractType;
  currentStep: PRContractStep;
  isScribeMode: boolean;
  lastUpdated: string; // ISO 8601
}

const DRAFT_KEY_PREFIX = 'amline_draft_';

export const localDraftStorage = {
  save(entry: Omit<DraftEntry, 'lastUpdated'>): void {
    const key = `${DRAFT_KEY_PREFIX}${entry.contractId}`;
    const data: DraftEntry = { ...entry, lastUpdated: new Date().toISOString() };
    localStorage.setItem(key, JSON.stringify(data));
  },

  load(contractId: string): DraftEntry | null {
    const raw = localStorage.getItem(`${DRAFT_KEY_PREFIX}${contractId}`);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as DraftEntry;
    } catch {
      return null;
    }
  },

  loadAll(): DraftEntry[] {
    return Object.keys(localStorage)
      .filter((k) => k.startsWith(DRAFT_KEY_PREFIX))
      .map((k) => {
        try {
          return JSON.parse(localStorage.getItem(k)!) as DraftEntry;
        } catch {
          return null;
        }
      })
      .filter((e): e is DraftEntry => e !== null);
  },

  remove(contractId: string): void {
    localStorage.removeItem(`${DRAFT_KEY_PREFIX}${contractId}`);
  },

  clearAll(): void {
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith(DRAFT_KEY_PREFIX)) localStorage.removeItem(k);
    }
  },
};
