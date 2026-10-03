import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { expectedTwilioSignature, formParams, validateTwilioRequest } from '../../backend/twilio-signature.js';

// SDK oficial (solo dependencia de desarrollo) como referencia de comparación.
const require = createRequire(import.meta.url);
const sdk = require('twilio/lib/webhooks/webhooks.js');

const token = '12345678901234567890123456789012';

describe('firma X-Twilio-Signature (paridad con el SDK oficial)', () => {
  const cases = [
    {
      url: 'https://example.com/api/twilio-status?lead=LB-ABCDEFGH',
      params: { MessageSid: `SM${'a'.repeat(32)}`, MessageStatus: 'delivered', AccountSid: `AC${'b'.repeat(32)}` },
    },
    {
      url: 'https://example.com:443/api/twilio-status?lead=LB-ZZZZZZZZ',
      params: { MessageStatus: 'read', ErrorCode: '', To: 'whatsapp:+526860000000' },
    },
    { url: 'https://mycompany.com/myapp.php?foo=1&bar=2', params: { CallSid: 'CA1234567890ABCDE', Caller: '+12349013030', Digits: '1234', From: '+12349013030', To: '+18005551212' } },
    { url: 'https://example.com/api/twilio-status', params: {} },
  ];

  it('calcula la misma firma que el SDK', () => {
    for (const { url, params } of cases) {
      expect(expectedTwilioSignature(token, url, params)).toBe(sdk.getExpectedTwilioSignature(token, url, params));
    }
  });

  it('acepta las firmas válidas que acepta el SDK (con y sin puerto)', () => {
    for (const { url, params } of cases) {
      const signature = sdk.getExpectedTwilioSignature(token, url, params);
      expect(sdk.validateRequest(token, signature, url, params)).toBe(true);
      expect(validateTwilioRequest(token, signature, url, params)).toBe(true);
      const withPort = url.replace('https://example.com/', 'https://example.com:443/');
      expect(validateTwilioRequest(token, signature, withPort, params)).toBe(
        sdk.validateRequest(token, signature, withPort, params),
      );
    }
  });

  it('rechaza firmas alteradas, otro token, otra URL o parámetros modificados', () => {
    const { url, params } = cases[0];
    const signature = sdk.getExpectedTwilioSignature(token, url, params);
    expect(validateTwilioRequest(token, `${signature.slice(0, -2)}xx`, url, params)).toBe(false);
    expect(validateTwilioRequest('otro-token-0000000000000000000000', signature, url, params)).toBe(false);
    expect(validateTwilioRequest(token, signature, url.replace('LB-ABCDEFGH', 'LB-HHHHHHHH'), params)).toBe(false);
    expect(validateTwilioRequest(token, signature, url, { ...params, MessageStatus: 'failed' })).toBe(false);
    expect(validateTwilioRequest(token, '', url, params)).toBe(false);
  });

  it('formParams no permite contaminar el prototipo', () => {
    const params = formParams('__proto__=x&constructor=y&MessageStatus=sent');
    expect(Object.getPrototypeOf(params)).toBeNull();
    expect(params.MessageStatus).toBe('sent');
    expect({}.x).toBeUndefined();
  });
});
