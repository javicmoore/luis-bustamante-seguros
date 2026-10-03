// Vercel Function: callback de estado de mensajes de Twilio (firma verificada).
import { createTwilioStatusHandler } from '../backend/twilio-status-handler.js';

const handle = createTwilioStatusHandler();

export default {
  fetch(request) {
    return handle(request);
  },
};
