// Sirve el build de producción (dist/) con el proveedor SIMULADO para probar el formulario
// localmente sin enviar mensajes reales. Las respuestas llevan demo: true y la interfaz lo indica.
// Uso: npm run build && npm run preview:demo      (opcional: --port 4173, --host para la red local)
import { preview } from 'vite';

process.env.LEAD_PROVIDER = 'mock';
process.env.MOCK_NOTIFY_OUTCOME ||= 'accepted';
delete process.env.VERCEL_ENV;

const portIndex = process.argv.indexOf('--port');
const port = portIndex > -1 ? Number(process.argv[portIndex + 1]) : 4173;

// --host expone el servidor en la red local para probar desde un teléfono (misma Wi-Fi).
const host = process.argv.includes('--host') ? '0.0.0.0' : '127.0.0.1';
const server = await preview({ preview: { port, strictPort: true, host } });
server.printUrls();
console.log(`Proveedor simulado: resultado "${process.env.MOCK_NOTIFY_OUTCOME}". No se envía ningún mensaje real.`);
