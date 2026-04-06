/**
 * API قرارداد — املاین
 * نکته عملیاتی: در محیط واقعی، backend مقدار `Authorization: Bearer <token>` را می‌پذیرد.
 * برای httpOnly-only در آینده باید توکن فقط از Set-Cookie هدر خوانده شود — بخش useAuth/backend.
 */
import axios from 'axios';
import { mapAxiosLikeError, parseFastApiValidationDetail } from '../../../lib/errorMapper';
import type {
  AddDatingDto,
  AddHomeInfoDto,
  AddMortgageDto,
  AddSalePriceDto,
  AddRentDto,
  AddWithnessDto,
  ContractResponse,
  FileResponse,
  ContractStatusApiResponse,
  ResolveInfoResponse,
  SendSignRequestDto,
  SendWitnessOtpDto,
  SetSigningDto,
  StartContractDto,
  UpdateContractPartyDto,
  UpdateStatus,
  VerifySignOtpDto,
  VerifyWitnessOtpDto,
  CommissionPayDto,
  CommissionPayResponse,
} from '../types/api';

function resolveApiBaseUrl(): string {
  try {
    const v = (import.meta as unknown as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL;
    if (v !== undefined && v !== null) return v;
  } catch {
    /* non-Vite */
  }
  if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL != null) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  return '';
}

const BASE_URL = resolveApiBaseUrl();

export const apiClient = axios.create({ baseURL: BASE_URL });

// ---- Auth interceptor ----
apiClient.interceptors.request.use((config) => {
  const token = document.cookie
    .split('; ')
    .find((r) => r.startsWith('access_token='))
    ?.split('=')[1];
  if (token) {
    const normalized = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    config.headers['Authorization'] = normalized;
  }
  return config;
});

// ---- Error interceptor: همیشه MappedApiError یکنواخت ----
apiClient.interceptors.response.use(
  (res) => res,
  (err) => Promise.reject(mapAxiosLikeError(err))
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

  addSalePrice: (id: string, dto: AddSalePriceDto) =>
    apiClient.post(`/contracts/${id}/sale-price`, dto),

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
    apiClient.get<ContractStatusApiResponse>(`/contracts/${id}/status`),

  getList: () =>
    apiClient.get<ContractResponse[]>('/contracts/list'),

  payCommission: (id: string, dto: CommissionPayDto) =>
    apiClient.post<CommissionPayResponse>(`/contracts/${id}/commission/pay`, dto),

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

/** @deprecated ترجیحاً از mapAxiosLikeError / parseFastApiValidationDetail استفاده کنید */
export function mapApiErrorToFields(detail: unknown): Record<string, string> {
  const { fieldErrors } = parseFastApiValidationDetail(detail);
  const flat: Record<string, string> = {};
  for (const [k, msgs] of Object.entries(fieldErrors)) {
    const arr = Array.isArray(msgs) ? msgs : [];
    const first = arr[0];
    if (first) flat[k] = first;
  }
  return flat;
}
