export interface SigningPartyEntry {
  id: string;
  label: string;
  mobile: string;
  partyType: 'LANDLORD' | 'TENANT';
  personType: 'NATURAL_PERSON' | 'LEGAL_PERSON';
}

const KEY_PREFIX = 'amline_sign_parties_';

function key(contractId: string): string {
  return `${KEY_PREFIX}${contractId}`;
}

export const signingPartiesStorage = {
  load(contractId: string): SigningPartyEntry[] {
    try {
      const raw = localStorage.getItem(key(contractId));
      if (!raw) return [];
      const parsed = JSON.parse(raw) as SigningPartyEntry[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  save(contractId: string, entries: SigningPartyEntry[]): void {
    localStorage.setItem(key(contractId), JSON.stringify(entries));
  },

  upsert(contractId: string, entry: SigningPartyEntry): void {
    const all = this.load(contractId);
    const idx = all.findIndex((x) => x.id === entry.id);
    if (idx >= 0) all[idx] = entry;
    else all.push(entry);
    this.save(contractId, all);
  },

  remove(contractId: string, partyId: string): void {
    const all = this.load(contractId).filter((x) => x.id !== partyId);
    this.save(contractId, all);
  },

  clear(contractId: string): void {
    localStorage.removeItem(key(contractId));
  },
};
