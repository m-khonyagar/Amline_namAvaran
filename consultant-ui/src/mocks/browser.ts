import { setupWorker } from 'msw/browser';
import { consultantSelfServiceHandlers } from './consultantPlatformHandlers';

export const worker = setupWorker(...consultantSelfServiceHandlers());
