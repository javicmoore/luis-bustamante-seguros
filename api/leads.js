// Vercel Function (Node.js, firma Web estándar). Lógica en backend/leads-handler.js.
import { createLeadsHandler } from '../backend/leads-handler.js';

const handle = createLeadsHandler();

export default {
  fetch(request) {
    return handle(request);
  },
};
