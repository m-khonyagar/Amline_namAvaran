/** Re-export unified Amline API error parsing for admin-ui */
export type { ApiErrorKind, MappedApiError } from '../../../packages/amline-ui-core/src/api/errorMapper'
export {
  ensureMappedError,
  isMappedApiError,
  mapAxiosLikeError,
  parseAmlineErrorBody,
  parseFastApiValidationDetail,
} from '../../../packages/amline-ui-core/src/api/errorMapper'
