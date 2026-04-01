import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { initialWizardState, wizardReducer, STEP_ORDER } from './wizardReducer'
import type { PRContractStep } from '../types/wizard'

const stepsArb: fc.Arbitrary<PRContractStep> = fc.constantFrom(
  ...(STEP_ORDER as PRContractStep[])
)

describe('wizardReducer', () => {
  it('APPLY_NEXT_STEP همیشه currentStep را به nextStep می‌گذارد (property)', () => {
    fc.assert(
      fc.property(stepsArb, stepsArb, (fromStep, nextStep) => {
        const state = {
          ...initialWizardState,
          contractId: 'c1',
          currentStep: fromStep,
          completedSteps: [],
        }
        const out = wizardReducer(state, {
          type: 'APPLY_NEXT_STEP',
          payload: { nextStep },
        })
        expect(out.currentStep).toBe(nextStep)
        expect(out.error).toBeNull()
      }),
      { numRuns: 100 }
    )
  })
})
