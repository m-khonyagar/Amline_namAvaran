import { setupWorker } from 'msw/browser';
import { consultantSelfServiceHandlers } from '../../../admin-ui/src/mocks/consultantPlatformHandlers';

export const worker = setupWorker(...consultantSelfServiceHandlers());
