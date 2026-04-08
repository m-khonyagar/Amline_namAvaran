/**
 * API قرارداد — املاین
 * نکته عملیاتی: در محیط واقعی، backend مقدار `Authorization: Bearer <token>` را می‌پذیرد.
 * برای httpOnly-only در آینده باید توکن فقط از Set-Cookie هدر خوانده شود — بخش useAuth/backend.
 */
import { apiClient } from '@/lib/api';
import { apiV1 } from '@/lib/apiPaths';
import { parseFastApiValidationDetail } from '../../../lib/errorMapper';

/** Re-export for wizard components that imported apiClient from this module */
export { apiClient };
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

/** پاسخ GET /api/v1/contracts/list (صفحه‌بندی) */
export interface ContractsListApiResponse {
  items: ContractResponse[]
  total: number
  page: number
  limit: number
}

export const contractApi = {
  start: (dto: StartContractDto) =>
    apiClient.post<ContractResponse>(apiV1('contracts/start'), dto),

  addLandlord: (id: string, dto: UpdateContractPartyDto) =>
    apiClient.post(apiV1(`contracts/${id}/party/landlord`), dto),

  setLandlord: (id: string, nextStep: string) =>
    apiClient.post(apiV1(`contracts/${id}/party/landlord/set`), { next_step: nextStep }),

  addTenant: (id: string, dto: UpdateContractPartyDto) =>
    apiClient.post(apiV1(`contracts/${id}/party/tenant`), dto),

  setTenant: (id: string, nextStep: string) =>
    apiClient.post(apiV1(`contracts/${id}/party/tenant/set`), { next_step: nextStep }),

  updateParty: (id: string, partyId: string, dto: UpdateContractPartyDto) =>
    apiClient.patch(apiV1(`contracts/${id}/party/${partyId}`), dto),

  deleteParty: (id: string, partyId: string) =>
    apiClient.delete<UpdateStatus>(apiV1(`contracts/${id}/party/${partyId}`)),

  addHomeInfo: (id: string, dto: AddHomeInfoDto) =>
    apiClient.post(apiV1(`contracts/${id}/home-info`), dto),

  addDating: (id: string, dto: AddDatingDto) =>
    apiClient.post(apiV1(`contracts/${id}/dating`), dto),

  addMortgage: (id: string, dto: AddMortgageDto) =>
    apiClient.post(apiV1(`contracts/${id}/mortgage`), dto),

  addSalePrice: (id: string, dto: AddSalePriceDto) =>
    apiClient.post(`/contracts/${id}/sale-price`, dto),

  addRenting: (id: string, dto: AddRentDto) =>
    apiClient.post(apiV1(`contracts/${id}/renting`), dto),

  sendSign: (id: string, dto: SendSignRequestDto) =>
    apiClient.post(apiV1(`contracts/${id}/sign`), dto),

  verifySign: (id: string, dto: VerifySignOtpDto) =>
    apiClient.post<UpdateStatus>(apiV1(`contracts/${id}/sign/verify`), dto),

  setSign: (id: string, dto: SetSigningDto) =>
    apiClient.post(apiV1(`contracts/${id}/sign/set`), dto),

  addWitness: (id: string, dto: AddWithnessDto) =>
    apiClient.post(apiV1(`contracts/${id}/add-witness`), dto),

  sendWitnessOtp: (id: string, dto: SendWitnessOtpDto) =>
    apiClient.post(apiV1(`contracts/${id}/witness/send-otp`), dto),

  verifyWitness: (id: string, dto: VerifyWitnessOtpDto) =>
    apiClient.post<UpdateStatus>(apiV1(`contracts/${id}/witness/verify`), dto),

  getStatus: (id: string) =>
    apiClient.get<ContractStatusApiResponse>(apiV1(`contracts/${id}/status`)),

  getList: (params?: { page?: number; limit?: number }) =>
    apiClient.get<ContractsListApiResponse>(apiV1('contracts/list'), { params }),

  payCommission: (id: string, dto: CommissionPayDto) =>
    apiClient.post<CommissionPayResponse>(`/contracts/${id}/commission/pay`, dto),

  resolveInfo: (type: string, text: string) =>
    apiClient.get<ResolveInfoResponse>(
      `${apiV1('contracts/resolve-info')}?type=${type}&text=${encodeURIComponent(text)}`
    ),

  uploadFile: (file: File, fileType: string) => {
    const form = new FormData();
    form.append('file', file);
    form.append('file_type', fileType);
    // Let the browser/axios set multipart boundary automatically.
    return apiClient.post<FileResponse>('/files/upload', form);
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
