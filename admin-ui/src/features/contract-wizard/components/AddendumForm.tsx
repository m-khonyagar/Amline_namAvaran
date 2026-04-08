import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { apiV1 } from '../../../lib/apiPaths';
import { apiClient } from '../api/contractApi';
import { StepErrorBanner } from './StepErrorBanner';
import { useMappedStepError } from '../hooks/useMappedStepError';

interface AddendumFormData {
  subject: string;
  content: string;
}

interface AddendumFormProps {
  contractId: string;
  onSuccess: () => void;
  onCancel?: () => void;
}

export function AddendumForm({ contractId, onSuccess, onCancel }: AddendumFormProps) {
  const { error: serverError, details, hint, setFromError, clear } = useMappedStepError();
  const [signStep, setSignStep] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AddendumFormData>();

  async function onSubmit(data: AddendumFormData) {
    clear();
    try {
      await apiClient.post(apiV1(`contracts/${contractId}/addendum`), {
        subject: data.subject,
        content: data.content,
      });
      setSignStep(true);
    } catch (err: unknown) {
      setFromError(err);
    }
  }

  async function handleInitiateSign() {
    clear();
    try {
      await apiClient.post(apiV1(`contracts/${contractId}/addendum/sign/initiate`));
      onSuccess();
    } catch (err: unknown) {
      setFromError(err);
    }
  }

  if (signStep) {
    return (
      <div dir="rtl" className="space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-700">
          متمم با موفقیت ثبت شد. برای تکمیل فرآیند، امضای طرفین الزامی است.
        </div>
        <StepErrorBanner message={serverError} details={details} hint={hint} onDismiss={() => clear()} />
        <button
          type="button"
          onClick={handleInitiateSign}
          className="w-full bg-primary text-white rounded-lg py-2.5 font-medium"
        >
          شروع فرآیند امضا
        </button>
      </div>
    );
  }

  return (
    <div dir="rtl" className="space-y-4">
      <h3 className="text-base font-bold text-gray-800">ثبت متمم جدید</h3>
      <StepErrorBanner message={serverError} details={details} hint={hint} onDismiss={() => clear()} />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">موضوع *</label>
          <input
            {...register('subject', { required: 'موضوع متمم الزامی است' })}
            type="text"
            placeholder="موضوع متمم را وارد کنید"
            className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary ${errors.subject ? 'border-red-500' : 'border-gray-300'}`}
          />
          {errors.subject && (
            <p className="mt-1 text-xs text-red-600" role="alert">{errors.subject.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">متن متمم *</label>
          <textarea
            {...register('content', { required: 'متن متمم الزامی است' })}
            rows={5}
            placeholder="متن کامل متمم را وارد کنید"
            className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary resize-none ${errors.content ? 'border-red-500' : 'border-gray-300'}`}
          />
          {errors.content && (
            <p className="mt-1 text-xs text-red-600" role="alert">{errors.content.message}</p>
          )}
        </div>

        <div className="flex gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 border border-gray-300 text-gray-600 rounded-lg py-2.5 text-sm"
            >
              انصراف
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-primary text-white rounded-lg py-2.5 font-medium disabled:opacity-50"
          >
            {isSubmitting ? 'در حال ثبت...' : 'ثبت متمم'}
          </button>
        </div>
      </form>
    </div>
  );
}
