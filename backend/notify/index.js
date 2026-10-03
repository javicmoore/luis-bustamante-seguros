import { createTwilioWhatsAppNotifier } from './twilio-whatsapp.js';
import { createMockNotifier } from './mock.js';

export function getNotifier(config) {
  if (config.provider === 'mock') return createMockNotifier({ outcome: config.mock?.outcome });
  if (config.provider === 'twilio') return createTwilioWhatsAppNotifier(config.twilio);
  throw new Error('provider_not_configured');
}
