// ============================================================================
// MÓDULO CRIPTOGRÁFICO DE LICENCIAMIENTO Y ACCESO DEV (100% OFFLINE)
// Sistema de Gestión de Ventas – Desarrollado por Julio_GE
// ============================================================================

/**
 * Llave maestra interna para firmas criptográficas HMAC locales.
 * Este secreto es el núcleo matemático que vincula el generador offline
 * con el motor de validación del aplicativo.
 */
const MASTER_CRYPTO_SALT = 'GV-JULIO-GE-2026-SECURE-KEY-ENGINE-8F92';

/**
 * Implementación portable y ligera de HMAC-SHA256 sincrónica para JS.
 * Funciona 100% offline en cualquier entorno (React, Electron, WebView Android).
 */
function sha256(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const lengthProperty = 'length';
  let i = 0;
  let j = 0;
  let result = '';
  const words: number[] = [];
  const asciiBitLength = ascii[lengthProperty] * 8;
  
  let hash: number[] = [];
  const k: number[] = [];
  let primeCounter = 0;

  const isComposite: Record<number, boolean> = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) isComposite[i] = true;
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }

  ascii += '\x80';
  while ((ascii[lengthProperty] % 64) - 56) ascii += '\x00';
  for (i = 0; i < ascii[lengthProperty]; i++) {
    j = ascii.charCodeAt(i);
    if (j >> 8) return '';
    words[i >> 2] |= j << (((3 - i) % 4) * 8);
  }
  words[words[lengthProperty]] = (asciiBitLength / maxWord) | 0;
  words[words[lengthProperty]] = asciiBitLength;

  for (j = 0; j < words[lengthProperty];) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash;
    hash = hash.slice(0, 8);

    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15], w2 = w[i - 2];
      const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
      const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
      const temp1 = (w[i] = (i < 16) ? w[i] : (w[i - 16] + s0 + w[i - 7] + s1) | 0);
      const s0Hash = rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22);
      const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      const t2 = (s0Hash + maj) | 0;
      const s1Hash = rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25);
      const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      const t1 = (hash[7] + s1Hash + ch + k[i] + temp1) | 0;

      hash = [(t1 + t2) | 0].concat(hash);
      hash[4] = (hash[4] + t1) | 0;
    }
    for (i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j >= 0; j--) {
      const b = (hash[i] >> (8 * j)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

function hmacSha256(key: string, message: string): string {
  const blockSize = 64;
  if (key.length > blockSize) key = sha256(key);
  while (key.length < blockSize) key += '\x00';

  let oKeyPad = '';
  let iKeyPad = '';
  for (let i = 0; i < blockSize; i++) {
    oKeyPad += String.fromCharCode(key.charCodeAt(i) ^ 0x5c);
    iKeyPad += String.fromCharCode(key.charCodeAt(i) ^ 0x36);
  }
  return sha256(oKeyPad + sha256(iKeyPad + message));
}

/**
 * Limpia y normaliza el ID de hardware para que sea amigable (ej: GV-A89F-12B0).
 */
export function formatFriendlyDeviceId(rawId: string | null | undefined): string {
  if (!rawId || rawId === 'web' || rawId.length < 4) return 'GV-DEV-LOCAL';
  const clean = rawId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const hash = sha256(clean).substring(0, 8).toUpperCase();
  return `GV-${hash.substring(0, 4)}-${hash.substring(4, 8)}`;
}

export type ValidatedLicenseResult =
  | { valid: true; type: 'lifetime'; deviceId: string }
  | { valid: true; type: 'timed'; deviceId: string; expiresAt: number; days: number }
  | { valid: false; reason: string };

/**
 * Valida un código de licencia criptográfico 100% offline.
 * Formato del código: GVLIC-V1-[ID_EQUIPO]-[TIPO:PERM|T37|T30|T90]-[TIMESTAMP]-[FIRMA_12]
 */
export function verifyCryptographicLicense(licenseCode: string, currentDeviceId: string): ValidatedLicenseResult {
  const code = licenseCode.trim().toUpperCase();
  if (!code.startsWith('GVLIC-V1-')) {
    return { valid: false, reason: 'Formato de licencia no reconocido' };
  }

  const parts = code.split('-');
  // Esperado: ["GVLIC", "V1", "ID_EQUIPO_1", "ID_EQUIPO_2", "TIPO", "TIMESTAMP", "FIRMA"]
  // O ["GVLIC", "V1", "IDEQUIPO", "TIPO", "TIMESTAMP", "FIRMA"]
  if (parts.length < 6) {
    return { valid: false, reason: 'Código de licencia incompleto' };
  }

  let devicePart = '';
  let typePart = '';
  let tsPart = '';
  let signaturePart = '';

  if (parts.length === 6) {
    devicePart = parts[2];
    typePart = parts[3];
    tsPart = parts[4];
    signaturePart = parts[5];
  } else if (parts.length === 7) {
    // Si el ID de equipo vino con guion medio ej: GV-A89F-12B0
    devicePart = `${parts[2]}-${parts[3]}`;
    typePart = parts[4];
    tsPart = parts[5];
    signaturePart = parts[6];
  } else {
    return { valid: false, reason: 'Estructura de clave inválida' };
  }

  // 1. Verificar coincidencia con el hardware de este equipo
  const localFriendly = formatFriendlyDeviceId(currentDeviceId).replace(/-/g, '');
  const targetClean = devicePart.replace(/-/g, '');

  // Permitir "UNIVERSAL" solo si fue firmado expresamente para terminales de prueba
  if (targetClean !== 'UNIVERSAL' && targetClean !== localFriendly) {
    return {
      valid: false,
      reason: `Esta licencia pertenece al equipo (${devicePart}), no a este terminal (${formatFriendlyDeviceId(currentDeviceId)})`,
    };
  }

  // 2. Verificar la firma criptográfica (no se puede falsificar sin la llave secreta del Dev)
  const payloadToVerify = `GVLIC:V1:${devicePart}:${typePart}:${tsPart}`;
  const expectedSig = hmacSha256(MASTER_CRYPTO_SALT, payloadToVerify).substring(0, 12).toUpperCase();

  if (signaturePart !== expectedSig) {
    return { valid: false, reason: 'Firma de licencia inválida o manipulada' };
  }

  const issuedAt = parseInt(tsPart, 10);
  if (isNaN(issuedAt) || issuedAt <= 0) {
    return { valid: false, reason: 'Parámetro temporal no válido' };
  }

  if (typePart === 'PERM') {
    return { valid: true, type: 'lifetime', deviceId: currentDeviceId };
  }

  let durationDays = 37;
  if (typePart === 'T30') durationDays = 30;
  else if (typePart === 'T37') durationDays = 37;
  else if (typePart === 'T90') durationDays = 90;
  else if (typePart === 'T365') durationDays = 365;

  const expiresAt = Date.now() + durationDays * 24 * 60 * 60 * 1000;
  return {
    valid: true,
    type: 'timed',
    deviceId: currentDeviceId,
    expiresAt,
    days: durationDays,
  };
}

// ============================================================================
// ACCESO DE DESARROLLADOR OFFLINE (CHALLENGE-RESPONSE OTP)
// ============================================================================

/**
 * Genera un código de desafío numérico aleatorio de 6 dígitos.
 */
export function generateDevChallenge(): string {
  const num = Math.floor(100000 + Math.random() * 900000);
  return String(num);
}

/**
 * Calcula la respuesta OTP que el Dev generará en su herramienta offline.
 * Respuesta = 6 dígitos matemáticamente vinculados al desafío.
 */
export function calculateDevOtpResponse(challenge: string): string {
  const clean = challenge.replace(/\s+/g, '').trim();
  const hash = hmacSha256(MASTER_CRYPTO_SALT, `DEV-CHALLENGE:${clean}`);
  // Convertir los primeros 8 caracteres hexadecimales en un número de 6 dígitos
  const subInt = parseInt(hash.substring(0, 8), 16);
  const otp = String(subInt % 1000000).padStart(6, '0');
  return otp;
}

/**
 * Verifica el código OTP ingresado contra el desafío actual.
 */
export function verifyDevChallengeResponse(challenge: string, enteredOtp: string): boolean {
  if (!challenge || !enteredOtp) return false;
  const cleanOtp = enteredOtp.replace(/\s+/g, '').trim();
  const expected = calculateDevOtpResponse(challenge);
  return cleanOtp === expected;
}
