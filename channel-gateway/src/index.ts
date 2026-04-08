export type { ChannelId, ProductSurface, NormalizedInboundMessage, ChannelAdapter } from './types.js';
export {
  buildWebHandoffUrl,
  buildChannelHandoffPreview,
  consultantPanelDeepLink,
} from './handoff.js';
export { telegramAdapterStub } from './adapters/telegramStub.js';
export { createChannelGatewayServer, startChannelGatewayServer } from './server.js';
