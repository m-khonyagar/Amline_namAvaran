import axios from 'axios';
import type {
  AddDatingDto,
  AddHomeInfoDto,
  AddMortgageDto,
  AddRentDto,
  AddWithnessDto,
  ContractResponse,
  FileResponse,
  ResolveInfoResponse,
  SendSignRequestDto,
  SendWitnessOtpDto,
  SetSigningDto,
  StartContractDto,
  UpdateContractPartyDto,
  UpdateStatus,
  VerifySignOtpDto,
  VerifyWitnessOtpDto,
} from '../types/api';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'https://api.amline.ir';

export const apiClient = axios.create({ baseURL: BASE_URL });

// ---- Auth interceptor ----
apiClient.interceptors.request.use((config) => {
  const token = document.cookie
    .split('; ')
    .find((r) => r.startsWith('access_token='))
    ?.split('=')[1];
  if (token) config.headers['Authorization'] = token;
  return config;
});

// ---- Error interceptor ----
apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 422) {
      return Promise.reject({
        type: 'VALIDATION' as const,
        fieldErrors: err.response.data?.detail ?? {},
      });
    }
    if (err.response?.status >= 500) {
      return Promise.reject({
        type: 'SERVER' as const,
        message: 'خطای سرور. لطفاً دوباره تلاش کنید.',
      });
    }
    if (!err.response) {
      return Promise.reject({
        type: 'NETWORK' as const,
        message: 'اتصال به اینترنت را بررسی کنید.',
      });
    }
    return Promise.reject(err);
  }
);

export const contractApi = {
  start: (dto: StartContractDto) =>
    apiClient.post<ContractResponse>('/contracts/start', dto),

  addLandlord: (id: string, dto: UpdateContractPartyDto) =>
    apiClient.post(`/contracts/${id}/party/landlord`, dto),

  setLandlord: (id: string, nextStep: string) =>
    apiClient.post(`/contracts/${id}/party/landlord/set`, { next_step: nextStep }),

  addTenant: (id: string, dto: UpdateContractPartyDto) =>
    apiClient.post(`/contracts/${id}/party/tenant`, dto),

  setTenant: (id: string, nextStep: string) =>
    apiClient.post(`/contracts/${id}/party/tenant/set`, { next_step: nextStep }),

  updateParty: (id: string, partyId: string, dto: UpdateContractPartyDto) =>
    apiClient.patch(`/contracts/${id}/party/${partyId}`, dto),

  deleteParty: (id: string, partyId: string) =>
    apiClient.delete<UpdateStatus>(`/contracts/${id}/party/${partyId}`),

  addHomeInfo: (id: string, dto: AddHomeInfoDto) =>
    apiClient.post(`/contracts/${id}/home-info`, dto),

  addDating: (id: string, dto: AddDatingDto) =>
    apiClient.post(`/contracts/${id}/dating`, dto),

  addMortgage: (id: string, dto: AddMortgageDto) =>
    apiClient.post(`/contracts/${id}/mortgage`, dto),

  addRenting: (id: string, dto: AddRentDto) =>
    apiClient.post(`/contracts/${id}/renting`, dto),

  sendSign: (id: string, dto: SendSignRequestDto) =>
    apiClient.post(`/contracts/${id}/sign`, dto),

  verifySign: (id: string, dto: VerifySignOtpDto) =>
    apiClient.post<UpdateStatus>(`/contracts/${id}/sign/verify`, dto),

  setSign: (id: string, dto: SetSigningDto) =>
    apiClient.post(`/contracts/${id}/sign/set`, dto),

  addWitness: (id: string, dto: AddWithnessDto) =>
    apiClient.post(`/contracts/${id}/add-witness`, dto),

  sendWitnessOtp: (id: string, dto: SendWitnessOtpDto) =>
    apiClient.post(`/contracts/${id}/witness/send-otp`, dto),

  verifyWitness: (id: string, dto: VerifyWitnessOtpDto) =>
    apiClient.post<UpdateStatus>(`/contracts/${id}/witness/verify`, dto),

  getStatus: (id: string) =>
    apiClient.get<{ status: string; step: string }>(`/contracts/${id}/status`),

  getList: () =>
    apiClient.get<ContractResponse[]>('/contracts/list'),

  resolveInfo: (type: string, text: string) =>
    apiClient.get<ResolveInfoResponse>(`/contracts/resolve-info?type=${type}&text=${encodeURIComponent(text)}`),

  uploadFile: (file: File, fileType: string) => {
    const form = new FormData();
    form.append('file', file);
    form.append('file_type', fileType);
    return apiClient.post<FileResponse>('/files/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

/**
 * تبدیل خطاهای 422 API به Record<fieldName, errorMessage>
 */
export function mapApiErrorToFields(
  detail: unknown
): Record<string, string> {
  if (!detail || !Array.isArray(detail)) return {};
  const result: Record<string, string> = {};
  for (const err of detail as Array<{ loc: string[]; msg: string }>) {
    if (err.loc && err.loc.length > 1) {
      const field = err.loc[err.loc.length - 1];
      result[field] = err.msg;
    }
  }
  return result;
}
