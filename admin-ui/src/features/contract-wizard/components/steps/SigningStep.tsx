import { useState } from 'react';
import { contractApi } from '../../api/contractApi';
import type { StepProps } from '../../types/wizard';
import { OtpForm } from '../OtpForm';
import { StepErrorBanner } from '../StepErrorBanner';
import { ensureMappedError } from '../../../../lib/errorMapper';
import { useMappedStepError } from '../../hooks/useMappedStepError';
import { DEV_FIXED_TEST_OTP, isAdminDevBypassEnabled } from '../../../../lib/devLocalAuth';

type SigningPhase = 'idle' | 'otp_sent' | 'waiting_other_party';

interface PartySignState {
  partyId: string;
  mobile: string;
  phase: SigningPhase;
  salt?: string;
}

export function SigningStep({ contractId, onComplete, signingParties = [] }: StepProps) {
  const devQuickOtp = isAdminDevBypassEnabled() ? DEV_FIXED_TEST_OTP : undefined;
  const [partyStates, setPartyStates] = useState<Record<string, PartySignState>>({});
  const [activePartyId, setActivePartyId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { error, details, hint, setFromError, clear } = useMappedStepError();
  const [otpError, setOtpError] = useState<string | null>(null);

  function getPartyState(partyId: string): PartySignState {
    return partyStates[partyId] ?? { partyId, mobile: '', phase: 'idle' };
  }

  async function handleRequestSign(partyId: string, mobile: string) {
    setIsLoading(true);
    clear();
    try {
      await contractApi.sendSign(contractId, {
        party_id: Number(partyId),
        signer_id: null,
        user_id: null,
        sign_type: 'OTP',
      });
      setPartyStates((prev) => ({
        ...prev,
        [partyId]: { partyId, mobile, phase: 'otp_sent' },
      }));
      setActivePartyId(partyId);
    } catch (err: unknown) {
      setFromError(err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleVerifyOtp(partyId: string, mobile: string, otp: string) {
    setOtpError(null);
    setIsLoading(true);
    try {
      const verifyRes = await contractApi.verifySign(contractId, {
        otp,
        mobile,
        salt: partyStates[partyId]?.salt ?? '',
      });
      if (verifyRes.data.ok) {
        // بررسی آیا همه طرفین امضا کرده‌اند
        const allSigned = signingParties.every((p) => {
          const s = partyStates[p.id];
          return p.id === partyId || s?.phase === 'waiting_other_party';
        });

        if (allSigned || signingParties.length <= 1) {
          const setRes = await contractApi.setSign(contractId, { next_step: 'WITNESS' });
          const nextStep = (setRes.data as { next_step?: string })?.next_step ?? 'WITNESS';
          onComplete(nextStep as import('../../types/wizard').PRContractStep);
        } else {
          setPartyStates((prev) => ({
            ...prev,
            [partyId]: { ...prev[partyId], phase: 'waiting_other_party' },
          }));
          setActivePartyId(null);
        }
      }
    } catch (err: unknown) {
      setOtpError(ensureMappedError(err).message);
    } finally {
      setIsLoading(false);
    }
  }

  const activeParty = signingParties.find((p) => p.id === activePartyId);

  return (
    <div dir="rtl" className="space-y-6">
      <h2 className="text-lg font-bold text-gray-800">امضای قرارداد</h2>
      <StepErrorBanner message={error} details={details} hint={hint} onDismiss={() => clear()} />

      {/* نمایش وضعیت امضای هر طرف */}
      <div className="space-y-3">
        {signingParties.map((party) => {
          const state = getPartyState(party.id);
          return (
            <div
              key={party.id}
              className="flex items-center justify-between border rounded-lg px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-gray-800">{party.label}</p>
                <p className="text-xs text-gray-500">{party.mobile}</p>
              </div>
              <div className="flex items-center gap-2">
                {state.phase === 'idle' && (
                  <button
                    type="button"
                    onClick={() => handleRequestSign(party.id, party.mobile)}
                    disabled={isLoading}
                    className="text-sm bg-primary text-white rounded-lg px-3 py-1.5 disabled:opacity-50"
                  >
                    ارسال OTP
                  </button>
                )}
                {state.phase === 'otp_sent' && (
                  <span className="text-xs text-blue-600 font-medium">⏳ در انتظار کد</span>
                )}
                {state.phase === 'waiting_other_party' && (
                  <span className="text-xs text-green-600 font-medium">✓ امضا شد</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* فرم OTP برای طرف فعال */}
      {activeParty && partyStates[activeParty.id]?.phase === 'otp_sent' && (
        <div className="border rounded-lg p-4 bg-blue-50">
          <p className="text-sm font-medium text-gray-700 mb-3">
            کد ارسال‌شده به {activeParty.label} را وارد کنید:
          </p>
          <OtpForm
            mobile={activeParty.mobile}
            onVerify={(otp) => handleVerifyOtp(activeParty.id, activeParty.mobile, otp)}
            onResend={() => handleRequestSign(activeParty.id, activeParty.mobile)}
            isLoading={isLoading}
            error={otpError}
            devQuickOtp={devQuickOtp}
          />
        </div>
      )}

      {/* حالت بدون parties (fallback) */}
      {signingParties.length === 0 && (
        <div className="text-center py-8 text-gray-500 text-sm">
          اطلاعات طرفین قرارداد بارگذاری نشده است.
        </div>
      )}
    </div>
  );
}
