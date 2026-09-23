// ============================================================================
// MÓDULO CRIPTOGRÁFICO DE LICENCIAMIENTO Y ACCESO DEV (100% OFFLINE)
// Sistema de Gestión de Ventas – Desarrollado por Julio_GE
// ============================================================================

/**
 * Llave maestra interna para firmas criptográficas HMAC locales.
 * Este secreto es el núcleo matemático que vincula el generador offline
 * con el motor de validación del aplicativo.
 */
export const MASTER_CRYPTO_SALT = 'GV-JULIO-GE-2026-SECURE-KEY-ENGINE-8F92';

/**
 * Implementación portable y ligera de HMAC-SHA256 sincrónica para JS.
 * Funciona 100% offline en cualquier entorno (React, Electron, WebView Android).
 */
export function sha256(ascii: string): string {
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

export function hmacSha256(key: string, message: string): string {
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
  | {
      valid: true;
      type: 'lifetime';
      plan: 'PERM';
      method: 'GVLIC';
      deviceId: string;
      issuedAt: number;
    }
  | {
      valid: true;
      type: 'timed';
      plan: string;
      method: 'GVLIC';
      deviceId: string;
      expiresAt: number;
      days: number;
      issuedAt: number;
    }
  | { valid: false; reason: string };

/**
 * Valida un código de licencia criptográfico 100% offline.
 * Formato del código: GVLIC-V1-[ID_EQUIPO]-[TIPO:PERM|T37|T30|PROMO3M|T180|T365]-[TIMESTAMP]-[FIRMA_12]
 * Corrección de cálculo temporal:
 * expiresAt = (issuedAt * 1000) + duraciónMs (no Date.now() + duración).
 * Se rechazan claves con issuedAt de más de 30 días de antigüedad o emitidas en fecha futura.
 */
export function verifyCryptographicLicense(licenseCode: string, currentDeviceId: string): ValidatedLicenseResult {
  const code = licenseCode.trim().toUpperCase();
  if (!code.startsWith('GVLIC-V1-')) {
    return { valid: false, reason: 'Formato de licencia no reconocido' };
  }

  const parts = code.split('-');
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

  // Permitir coincidencia exacta, o comodines de prueba DEV/UNIVERSAL
  const isMatch =
    targetClean === localFriendly ||
    targetClean === 'UNIVERSAL' ||
    (targetClean === 'GVDEVLOCAL' && (localFriendly === 'GVDEVLOCAL' || localFriendly.startsWith('GV')));

  if (!isMatch) {
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

  const now = Date.now();
  const issuedMs = issuedAt * 1000;

  // Tolerancia de 10 minutos para reloj en el futuro
  if (issuedMs > now + 10 * 60 * 1000) {
    return { valid: false, reason: 'La fecha de emisión de esta licencia está en el futuro respecto al equipo' };
  }

  // Rechazar códigos emitidos hace más de 30 días sin haber sido activados
  const maxActivationWindowMs = 30 * 24 * 60 * 60 * 1000;
  if (now - issuedMs > maxActivationWindowMs) {
    return { valid: false, reason: 'Esta clave de licencia ha expirado (más de 30 días desde su emisión por el desarrollador)' };
  }

  if (typePart === 'PERM') {
    return {
      valid: true,
      type: 'lifetime',
      plan: 'PERM',
      method: 'GVLIC',
      deviceId: currentDeviceId,
      issuedAt,
    };
  }

  let durationDays = 37;
  if (typePart === 'T30') durationDays = 30;
  else if (typePart === 'T37') durationDays = 37;
  else if (typePart === 'T90' || typePart === 'PROMO3M') durationDays = 90;
  else if (typePart === 'T180') durationDays = 180;
  else if (typePart === 'T365') durationDays = 365;
  else if (typePart.startsWith('T')) {
    const parsed = parseInt(typePart.substring(1), 10);
    if (!isNaN(parsed) && parsed > 0) durationDays = parsed;
  }

  // Regla estricta: expiresAt = issuedAt * 1000 + duración
  const expiresAt = issuedMs + durationDays * 24 * 60 * 60 * 1000;

  if (expiresAt <= now) {
    return { valid: false, reason: 'El período de validez de esta licencia ya ha concluido' };
  }

  return {
    valid: true,
    type: 'timed',
    plan: typePart,
    method: 'GVLIC',
    deviceId: currentDeviceId,
    expiresAt,
    days: durationDays,
    issuedAt,
  };
}

/**
 * Generador de licencias criptográficas integrado para el panel de Dev.
 */
export function generateCryptographicLicense(deviceId: string, type: 'PERM' | 'T30' | 'T37' | 'T90' | 'PROMO3M' | 'T180' | 'T365' | string): string {
  const cleanDevice = deviceId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const ts = Math.floor(Date.now() / 1000);
  const payload = `GVLIC:V1:${cleanDevice}:${type}:${ts}`;
  const sig = hmacSha256(MASTER_CRYPTO_SALT, payload).substring(0, 12).toUpperCase();
  return `GVLIC-V1-${cleanDevice}-${type}-${ts}-${sig}`;
}

/**
 * Comprueba si un terminal específico se encuentra en la lista negra o bloqueado.
 */
export function isTerminalIdBlocked(terminalId: string | null | undefined, blockedList?: string[]): boolean {
  if (!terminalId) return false;
  const friendly = formatFriendlyDeviceId(terminalId).toUpperCase();
  const clean = terminalId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  
  const list = blockedList || (() => {
    try {
      const raw = localStorage.getItem('blocked_terminals');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  })();

  return list.some((item: string) => {
    const itemClean = item.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    return itemClean === clean || item.toUpperCase() === friendly;
  });
}

// ============================================================================
// REPORTE EXPORTABLE DE TERMINAL (FUNCIÓN C - FIRMADO CON HMAC)
// ============================================================================

export interface TerminalReportPayload {
  version: '1.0';
  friendlyDeviceId: string;
  businessName: string;
  users: Array<{ username: string; name: string; role: 'admin' | 'employee'; method?: string }>;
  method: 'GVLIC' | 'LEGACY' | 'QR_SYNC';
  plan: string;
  issuedAt?: number;
  expiresAt?: number | null;
  licenseSource: string;
  timestamp: number;
  signature: string;
}

export function generateSignedTerminalReport(params: {
  friendlyDeviceId: string;
  businessName: string;
  users: Array<{ username: string; name: string; role: 'admin' | 'employee'; method?: string }>;
  method: 'GVLIC' | 'LEGACY' | 'QR_SYNC';
  plan: string;
  issuedAt?: number;
  expiresAt?: number | null;
  licenseSource?: string;
}): TerminalReportPayload {
  const timestamp = Date.now();
  const payloadToSign = `REPORT:V1:${params.friendlyDeviceId}:${params.businessName}:${params.method}:${params.plan}:${params.expiresAt ?? 'perm'}:${timestamp}`;
  const signature = hmacSha256(MASTER_CRYPTO_SALT, payloadToSign);

  return {
    version: '1.0',
    friendlyDeviceId: params.friendlyDeviceId,
    businessName: params.businessName,
    users: params.users,
    method: params.method,
    plan: params.plan,
    issuedAt: params.issuedAt,
    expiresAt: params.expiresAt,
    licenseSource: params.licenseSource || 'Terminal Local',
    timestamp,
    signature,
  };
}

export function verifyTerminalReportSignature(report: TerminalReportPayload): boolean {
  if (!report || !report.signature || !report.friendlyDeviceId) return false;
  const payloadToSign = `REPORT:V1:${report.friendlyDeviceId}:${report.businessName}:${report.method}:${report.plan}:${report.expiresAt ?? 'perm'}:${report.timestamp}`;
  const expectedSig = hmacSha256(MASTER_CRYPTO_SALT, payloadToSign);
  return report.signature === expectedSig;
}

// ============================================================================
// CONFIGURACIÓN DE PAGOS BANCARIOS Y OFERTAS DE RENOVACIÓN
// ============================================================================

export interface BankPaymentConfig {
  cardNumber: string;
  confirmPhone: string;
  beneficiaryName: string;
  monthlyPrice: number;
  quarterlyPrice: number;
  annualPrice: number;
  lifetimePrice: number;
  currency: string;
}

export const DEFAULT_BANK_PAYMENT_CONFIG: BankPaymentConfig = {
  cardNumber: '9204-1299-7834-5835',
  confirmPhone: '51616816',
  beneficiaryName: 'Julio_GE (Desarrollador Oficial)',
  monthlyPrice: 1200,
  quarterlyPrice: 3000,
  annualPrice: 10000,
  lifetimePrice: 25000,
  currency: 'CUP',
};

export const STORAGE_KEY_SUBMITTED_PAYMENTS = 'gv_submitted_payments_v1';

export function getSubmittedPayments(): Array<{
  id: string;
  terminalId: string;
  businessName: string;
  clientName?: string;
  clientPhone?: string;
  planId: string;
  planTitle: string;
  amount: number;
  currency: string;
  transactionNumber: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SUBMITTED_PAYMENTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveSubmittedPayment(payment: {
  terminalId: string;
  businessName: string;
  clientName?: string;
  clientPhone?: string;
  planId: string;
  planTitle: string;
  amount: number;
  currency: string;
  transactionNumber: string;
}) {
  const existing = getSubmittedPayments();
  const record = {
    ...payment,
    id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    status: 'pending' as const,
    createdAt: new Date().toISOString(),
  };
  const updated = [record, ...existing.filter(p => p.transactionNumber !== payment.transactionNumber)];
  localStorage.setItem(STORAGE_KEY_SUBMITTED_PAYMENTS, JSON.stringify(updated));
  return record;
}

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
