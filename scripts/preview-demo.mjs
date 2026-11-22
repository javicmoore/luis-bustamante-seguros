// Sirve el build (dist/) para probarlo localmente, con los headers de vercel.json.
// Uso: npm run build && npm run preview:demo      (opcional: --port 4173, --host para la red local)
// El formulario no llama a ningún servidor: prepara el mensaje de WhatsApp en el navegador. Con un build
// SITE_MODE=demo solo muestra la vista previa; con el build final abre WhatsApp sin enviar nada solo.
import { preview } from 'vite';

delete process.env.VERCEL_ENV;

const portIndex = process.argv.indexOf('--port');
const port = portIndex > -1 ? Number(process.argv[portIndex + 1]) : 4173;

// --host expone el servidor en la red local para probar desde un teléfono (misma Wi-Fi).
const host = process.argv.includes('--host') ? '0.0.0.0' : '127.0.0.1';
const server = await preview({ preview: { port, strictPort: true, host } });
server.printUrls();
