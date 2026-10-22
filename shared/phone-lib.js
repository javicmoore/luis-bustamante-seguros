// Registra las reglas telefónicas internacionales (libphonenumber-js) en el esquema compartido.
// Servidor y pruebas lo importan al inicio; el navegador lo carga bajo demanda (import()).
import { isValidPhoneNumber, parsePhoneNumberFromString } from 'libphonenumber-js/min';
import { setPhoneLibrary } from './lead-schema.js';

setPhoneLibrary({ isValidPhoneNumber, parsePhoneNumberFromString });
