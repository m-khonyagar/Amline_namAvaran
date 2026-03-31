import { createContext, useContext, useReducer, type ReactNode } from 'react';
import { initialWizardState, wizardReducer } from './wizardReducer';
import type { WizardAction, WizardState } from '../types/wizard';

interface WizardContextValue {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
}

const WizardContext = createContext<WizardContextValue | null>(null);

interface WizardProviderProps {
  children: ReactNode;
  platform?: 'admin' | 'user';
}

export function WizardProvider({ children, platform = 'user' }: WizardProviderProps) {
  const [state, dispatch] = useReducer(wizardReducer, {
    ...initialWizardState,
    platform,
  });

  return (
    <WizardContext.Provider value={{ state, dispatch }}>
      {children}
    </WizardContext.Provider>
  );
}

export function useWizard(): WizardContextValue {
  const ctx = useContext(WizardContext);
  if (!ctx) {
    throw new Error('useWizard must be used inside WizardProvider');
  }
  return ctx;
}
