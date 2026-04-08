/** Re-export unified Amline API error parsing for admin-ui */
export type { ApiErrorKind, MappedApiError } from '@amline/ui-core/api/errorMapper'
export {
  ensureMappedError,
  isMappedApiError,
  mapAxiosLikeError,
  parseAmlineErrorBody,
  parseFastApiValidationDetail,
} from '@amline/ui-core/api/errorMapper'
