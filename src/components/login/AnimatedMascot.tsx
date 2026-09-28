import React, { useId } from 'react';

export type MascotVariant = 'morning' | 'afternoon' | 'night';

interface MascotProps {
  variant?: MascotVariant;
  isPasswordFocused?: boolean;
  isUserFocused?: boolean;
  isSuccess?: boolean;
  hasError?: boolean;
  characterLength?: number;
}

export default function AnimatedMascot({
  variant = 'morning',
  isPasswordFocused = false,
  isUserFocused = false,
  isSuccess = false,
  hasError = false,
  characterLength = 0,
}: MascotProps) {
  const gradientId = useId();

  // Calcular desplazamiento horizontal y vertical de los ojos según lo que escribe el usuario
  const eyeShiftX = isUserFocused ? Math.min(Math.max((characterLength - 8) * 0.85, -6), 6) : 0;
  const eyeShiftY = isUserFocused ? 3 : isPasswordFocused ? -4 : 0;

  return (
    <div className="relative flex flex-col items-center justify-center select-none pointer-events-none mb-3">
      {/* ----------------- VARIANTE 1: MAÑANA (Taza Verde Esmeralda, Ribete Amarillo Dorado y Base Azul) ----------------- */}
      {variant === 'morning' && (
        <>
          {/* Vapor flotante animado de la taza (Verde Menta, Azul y Dorado) */}
          <div className="absolute -top-7 flex gap-2 opacity-85">
            <span
              className="w-1.5 h-6 bg-gradient-to-t from-emerald-500/50 via-sky-400/30 to-transparent rounded-full animate-pulse blur-[0.5px]"
              style={{ animationDuration: '2s' }}
            />
            <span
              className="w-1.5 h-8 bg-gradient-to-t from-amber-400/60 via-yellow-300/40 to-transparent rounded-full animate-pulse blur-[0.5px]"
              style={{ animationDuration: '2.4s', animationDelay: '0.3s' }}
            />
            <span
              className="w-1.5 h-5 bg-gradient-to-t from-sky-500/50 via-emerald-400/30 to-transparent rounded-full animate-pulse blur-[0.5px]"
              style={{ animationDuration: '1.9s', animationDelay: '0.7s' }}
            />
          </div>

          <svg
            viewBox="0 0 160 140"
            className={`w-32 h-28 drop-shadow-xl transition-transform duration-300 ${
              hasError ? 'animate-wiggle' : isSuccess ? 'scale-105' : 'hover:scale-102'
            }`}
          >
            <defs>
              {/* Verde Esmeralda Oficial */}
              <linearGradient id={`m-cup-body-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="40%" stopColor="#059669" />
                <stop offset="100%" stopColor="#047857" />
              </linearGradient>

              {/* Azul Oficial */}
              <linearGradient id={`m-blue-${gradientId}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="50%" stopColor="#0ea5e9" />
                <stop offset="100%" stopColor="#0284c7" />
              </linearGradient>

              {/* Amarillo / Oro Oficial */}
              <linearGradient id={`m-gold-${gradientId}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="50%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#f59e0b" />
              </linearGradient>

              {/* Café cremoso con tintes de arte latte */}
              <linearGradient id={`m-coffee-liquid-${gradientId}`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#451a03" />
                <stop offset="50%" stopColor="#78350f" />
                <stop offset="100%" stopColor="#451a03" />
              </linearGradient>
            </defs>

            {/* Plato base (Azul y Oro Oficial) */}
            <ellipse cx="80" cy="126" rx="56" ry="8" fill="#0284c7" opacity="0.3" />
            <ellipse cx="80" cy="124" rx="52" ry="7" fill={`url(#m-blue-${gradientId})`} />
            <ellipse cx="80" cy="122" rx="46" ry="5" fill={`url(#m-gold-${gradientId})`} />

            {/* Asa de la taza (Verde Esmeralda con ribete Dorado) */}
            <path
              d="M 115 50 C 145 50 145 95 110 95"
              fill="none"
              stroke={`url(#m-cup-body-${gradientId})`}
              strokeWidth="11"
              strokeLinecap="round"
            />
            <path
              d="M 115 50 C 142 50 142 95 112 95"
              fill="none"
              stroke={`url(#m-gold-${gradientId})`}
              strokeWidth="3.5"
              strokeLinecap="round"
              opacity="0.9"
            />

            {/* Cuerpo principal (Verde Esmeralda) */}
            <path
              d="M 40 40 L 120 40 C 120 85 105 115 80 115 C 55 115 40 85 40 40 Z"
              fill={`url(#m-cup-body-${gradientId})`}
            />

            {/* Borde superior con ribete Amarillo Oro y Azul */}
            <ellipse cx="80" cy="40" rx="40" ry="12" fill={`url(#m-gold-${gradientId})`} />
            <ellipse cx="80" cy="40" rx="37" ry="10.5" fill={`url(#m-cup-body-${gradientId})`} />
            <ellipse cx="80" cy="40" rx="35" ry="9.5" fill={`url(#m-coffee-liquid-${gradientId})`} />
            <ellipse cx="80" cy="39" rx="28" ry="6.5" fill="#fef08a" opacity="0.9" />
            <ellipse cx="78" cy="38" rx="20" ry="4.5" fill="#ffffff" opacity="0.95" />

            {/* Reflejo de luz */}
            <path
              d="M 48 50 C 46 70 54 95 72 106"
              fill="none"
              stroke="#ffffff"
              strokeWidth="3.5"
              strokeLinecap="round"
              opacity="0.4"
            />

            {/* Emblema / Cinta inferior Azul Cian y Amarillo en el cuerpo */}
            <path
              d="M 52 102 Q 80 116 108 102"
              fill="none"
              stroke={`url(#m-blue-${gradientId})`}
              strokeWidth="3"
              strokeLinecap="round"
            />

            {/* Mejillas */}
            <ellipse cx="55" cy="78" rx="6" ry="3.5" fill="#fbbf24" opacity="0.6" />
            <ellipse cx="105" cy="78" rx="6" ry="3.5" fill="#fbbf24" opacity="0.6" />

            {/* Ojos */}
            {!isPasswordFocused ? (
              <g className="transition-transform duration-150" style={{ transform: `translate(${eyeShiftX}px, ${eyeShiftY}px)` }}>
                <circle cx="64" cy="68" r="8" fill="#ffffff" />
                <circle cx="64" cy="68" r="5" fill="#0f172a" />
                <circle cx="62" cy="66" r="2.2" fill="#ffffff" />

                {isSuccess ? (
                  <path d="M 90 68 Q 96 62 102 68" fill="none" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
                ) : (
                  <>
                    <circle cx="96" cy="68" r="8" fill="#ffffff" />
                    <circle cx="96" cy="68" r="5" fill="#0f172a" />
                    <circle cx="94" cy="66" r="2.2" fill="#ffffff" />
                  </>
                )}
              </g>
            ) : (
              <g>
                <path d="M 58 68 Q 64 74 70 68" fill="none" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
                <path d="M 90 68 Q 96 74 102 68" fill="none" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
              </g>
            )}

            {/* Boca */}
            {hasError ? (
              <ellipse cx="80" cy="84" rx="4.5" ry="6" fill="#0f172a" />
            ) : isSuccess ? (
              <path d="M 72 80 Q 80 92 88 80 Z" fill="#f59e0b" stroke="#0f172a" strokeWidth="1.5" />
            ) : isPasswordFocused ? (
              <path d="M 75 80 Q 80 84 85 80" fill="none" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
            ) : (
              <path d="M 74 79 Q 80 87 86 79" fill="none" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
            )}

            {/* Manitas que tapan ojos (Amarillo Oro) */}
            <g
              className="transition-all duration-300 ease-out origin-[45px_95px]"
              style={{
                transform: isPasswordFocused ? 'translate(15px, -20px) rotate(-15deg)' : 'translate(0, 0)',
              }}
            >
              <ellipse cx="48" cy="90" rx="9" ry="7" fill={`url(#m-gold-${gradientId})`} stroke="#059669" strokeWidth="1.5" />
              <ellipse cx="46" cy="88" rx="6" ry="4" fill="#ffffff" opacity="0.6" />
            </g>

            <g
              className="transition-all duration-300 ease-out origin-[115px_95px]"
              style={{
                transform: isPasswordFocused ? 'translate(-15px, -20px) rotate(15deg)' : 'translate(0, 0)',
              }}
            >
              <ellipse cx="112" cy="90" rx="9" ry="7" fill={`url(#m-gold-${gradientId})`} stroke="#059669" strokeWidth="1.5" />
              <ellipse cx="114" cy="88" rx="6" ry="4" fill="#ffffff" opacity="0.6" />
            </g>
          </svg>
        </>
      )}

      {/* ----------------- VARIANTE 2: TARDE (Frappé Azul Cielo, Faja Verde Esmeralda y Gafas Doradas) ----------------- */}
      {variant === 'afternoon' && (
        <>
          {/* Chispas y estrellas de energía (Amarillo, Azul y Verde) */}
          <div className="absolute -top-6 flex gap-3 opacity-90">
            <span className="w-2 h-2 rounded-xs rotate-12 bg-amber-400 animate-bounce" style={{ animationDuration: '2.2s' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" style={{ animationDuration: '3s' }} />
            <span className="w-2.5 h-2.5 rounded-xs -rotate-12 bg-emerald-400 animate-bounce" style={{ animationDuration: '2.6s', animationDelay: '0.4s' }} />
          </div>

          <svg
            viewBox="0 0 160 145"
            className={`w-32 h-28 drop-shadow-xl transition-transform duration-300 ${
              hasError ? 'animate-wiggle' : isSuccess ? 'scale-105' : 'hover:scale-102'
            }`}
          >
            <defs>
              {/* Azul Cielo Oficial */}
              <linearGradient id={`a-cup-body-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="40%" stopColor="#0ea5e9" />
                <stop offset="100%" stopColor="#0284c7" />
              </linearGradient>

              {/* Verde Esmeralda */}
              <linearGradient id={`a-green-${gradientId}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="50%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>

              {/* Amarillo Dorado */}
              <linearGradient id={`a-gold-${gradientId}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="50%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#f59e0b" />
              </linearGradient>

              {/* Crema suave */}
              <linearGradient id={`a-cream-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="60%" stopColor="#f0fdf4" />
                <stop offset="100%" stopColor="#dcfce7" />
              </linearGradient>
            </defs>

            {/* Sombra base */}
            <ellipse cx="80" cy="132" rx="46" ry="6" fill="#0284c7" opacity="0.3" />

            {/* Pajilla con franjas Verde Esmeralda y Amarillo */}
            <path
              d="M 98 12 L 88 50"
              stroke={`url(#a-green-${gradientId})`}
              strokeWidth="7"
              strokeLinecap="round"
            />
            <path
              d="M 106 5 L 98 12"
              stroke={`url(#a-gold-${gradientId})`}
              strokeWidth="7"
              strokeLinecap="round"
            />

            {/* Crema batida superior */}
            <path
              d="M 52 46 C 48 32 64 24 76 28 C 82 20 98 22 102 32 C 112 36 112 48 106 50 Z"
              fill={`url(#a-cream-${gradientId})`}
            />
            {/* Espirales de sirope caramelo dorado */}
            <path
              d="M 60 38 Q 78 30 96 38"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path
              d="M 68 44 Q 82 36 94 45"
              fill="none"
              stroke="#10b981"
              strokeWidth="2"
              strokeLinecap="round"
            />

            {/* Vaso de Frappé Azul */}
            <path
              d="M 46 48 L 114 48 L 102 124 C 102 128 94 130 80 130 C 66 130 58 128 58 124 Z"
              fill={`url(#a-cup-body-${gradientId})`}
            />

            {/* Faja decorativa Verde Esmeralda con ribete Dorado */}
            <path
              d="M 52 74 L 108 74 L 105 94 L 55 94 Z"
              fill={`url(#a-green-${gradientId})`}
            />
            <ellipse cx="80" cy="84" rx="8" ry="7" fill={`url(#a-gold-${gradientId})`} />
            <circle cx="80" cy="84" r="3" fill="#ffffff" />

            {/* Brillo en el vaso */}
            <path
              d="M 54 56 L 63 118"
              stroke="#ffffff"
              strokeWidth="3"
              strokeLinecap="round"
              opacity="0.4"
            />

            {/* Mejillas */}
            <ellipse cx="60" cy="88" rx="5.5" ry="3.5" fill="#fde047" opacity="0.6" />
            <ellipse cx="100" cy="88" rx="5.5" ry="3.5" fill="#fde047" opacity="0.6" />

            {/* Ojos */}
            {!isPasswordFocused ? (
              <g className="transition-transform duration-150" style={{ transform: `translate(${eyeShiftX}px, ${eyeShiftY}px)` }}>
                <circle cx="68" cy="78" r="7.5" fill="#ffffff" />
                <circle cx="68" cy="78" r="4.8" fill="#0f172a" />
                <circle cx="66" cy="76" r="2" fill="#ffffff" />

                {isSuccess ? (
                  <path d="M 86 78 Q 92 72 98 78" fill="none" stroke="#0f172a" strokeWidth="2.8" strokeLinecap="round" />
                ) : (
                  <>
                    <circle cx="92" cy="78" r="7.5" fill="#ffffff" />
                    <circle cx="92" cy="78" r="4.8" fill="#0f172a" />
                    <circle cx="90" cy="76" r="2" fill="#ffffff" />
                  </>
                )}
              </g>
            ) : (
              <g>
                <path d="M 62 78 Q 68 84 74 78" fill="none" stroke="#0f172a" strokeWidth="2.8" strokeLinecap="round" />
                <path d="M 86 78 Q 92 84 98 78" fill="none" stroke="#0f172a" strokeWidth="2.8" strokeLinecap="round" />
              </g>
            )}

            {/* Gafas de sol Verde Esmeralda y Dorado */}
            <g
              className="transition-all duration-300 ease-out"
              style={{
                transform: isPasswordFocused ? 'translate(0px, 22px)' : 'translate(0px, 0px)',
              }}
            >
              {/* Lente izquierdo */}
              <rect x="56" y="56" width="22" height="14" rx="4" fill="#0f172a" stroke="#10b981" strokeWidth="2" />
              <path d="M 58 59 L 66 67" stroke="#38bdf8" strokeWidth="1.5" opacity="0.7" strokeLinecap="round" />
              {/* Puente dorado */}
              <rect x="76" y="60" width="8" height="3" rx="1.5" fill="#fbbf24" />
              {/* Lente derecho */}
              <rect x="82" y="56" width="22" height="14" rx="4" fill="#0f172a" stroke="#10b981" strokeWidth="2" />
              <path d="M 84 59 L 92 67" stroke="#38bdf8" strokeWidth="1.5" opacity="0.7" strokeLinecap="round" />
            </g>

            {/* Boca */}
            {hasError ? (
              <ellipse cx="80" cy="94" rx="4" ry="5.5" fill="#0f172a" />
            ) : isSuccess ? (
              <path d="M 72 90 Q 80 102 88 90 Z" fill="#fbbf24" stroke="#0f172a" strokeWidth="1.5" />
            ) : isPasswordFocused ? (
              <path d="M 75 92 Q 80 96 85 92" fill="none" stroke="#0f172a" strokeWidth="2.2" strokeLinecap="round" />
            ) : (
              <path d="M 74 91 Q 80 98 86 91" fill="none" stroke="#0f172a" strokeWidth="2.4" strokeLinecap="round" />
            )}

            {/* Manitas */}
            <g
              className="transition-all duration-300 ease-out origin-[48px_100px]"
              style={{
                transform: isPasswordFocused ? 'translate(12px, -18px) rotate(-10deg)' : 'translate(0, 0)',
              }}
            >
              <circle cx="48" cy="100" r="7" fill="#fbbf24" stroke="#059669" strokeWidth="1.5" />
            </g>
            <g
              className="transition-all duration-300 ease-out origin-[112px_100px]"
              style={{
                transform: isPasswordFocused ? 'translate(-12px, -18px) rotate(10deg)' : 'translate(0, 0)',
              }}
            >
              <circle cx="112" cy="100" r="7" fill="#fbbf24" stroke="#059669" strokeWidth="1.5" />
            </g>
          </svg>
        </>
      )}

      {/* ----------------- VARIANTE 3: NOCHE (Taza Azul Noche, Gorro Verde Esmeralda & Luna Amarilla Dorada) ----------------- */}
      {variant === 'night' && (
        <>
          {/* Estrellitas nocturnas Amarillas y Cyan */}
          <div className="absolute -top-7 flex items-center justify-between w-36 px-2 opacity-90">
            <span className="text-yellow-300 text-xs animate-ping" style={{ animationDuration: '3.2s' }}>★</span>
            <span className="text-sky-300 text-sm font-bold animate-pulse" style={{ animationDuration: '2.5s' }}>✦</span>
            <span className="text-emerald-300 text-xs animate-ping" style={{ animationDuration: '2.8s', animationDelay: '0.6s' }}>★</span>
          </div>

          <svg
            viewBox="0 0 160 145"
            className={`w-32 h-28 drop-shadow-2xl transition-transform duration-300 ${
              hasError ? 'animate-wiggle' : isSuccess ? 'scale-105' : 'hover:scale-102'
            }`}
          >
            <defs>
              {/* Azul Noche & Verde Esmeralda */}
              <linearGradient id={`n-cup-body-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1e3a8a" />
                <stop offset="50%" stopColor="#0f766e" />
                <stop offset="100%" stopColor="#064e3b" />
              </linearGradient>

              {/* Gorrito Verde Esmeralda */}
              <linearGradient id={`n-hat-${gradientId}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="50%" stopColor="#059669" />
                <stop offset="100%" stopColor="#047857" />
              </linearGradient>

              {/* Luna Creciente Amarilla Radiante */}
              <linearGradient id={`n-moon-${gradientId}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="50%" stopColor="#fde047" />
                <stop offset="100%" stopColor="#f59e0b" />
              </linearGradient>
            </defs>

            {/* Plato base */}
            <ellipse cx="80" cy="128" rx="54" ry="7" fill="#0284c7" opacity="0.3" />
            <ellipse cx="80" cy="126" rx="50" ry="6" fill="#047857" />
            <ellipse cx="80" cy="124" rx="44" ry="4.5" fill={`url(#n-moon-${gradientId})`} />

            {/* Asa de la taza */}
            <path
              d="M 115 54 C 145 54 145 99 110 99"
              fill="none"
              stroke={`url(#n-cup-body-${gradientId})`}
              strokeWidth="11"
              strokeLinecap="round"
            />
            <path
              d="M 115 54 C 142 54 142 99 112 99"
              fill="none"
              stroke={`url(#n-moon-${gradientId})`}
              strokeWidth="3.5"
              strokeLinecap="round"
              opacity="0.85"
            />

            {/* Cuerpo de la taza */}
            <path
              d="M 40 44 L 120 44 C 120 89 105 119 80 119 C 55 119 40 89 40 44 Z"
              fill={`url(#n-cup-body-${gradientId})`}
            />

            {/* Café líquido */}
            <ellipse cx="80" cy="44" rx="40" ry="12" fill={`url(#n-cup-body-${gradientId})`} />
            <ellipse cx="80" cy="44" rx="36" ry="10" fill="#0f172a" />

            {/* Luna Creciente Amarilla grabada en el pecho */}
            <path
              d="M 83 95 A 9 9 0 0 0 74 105 A 11 11 0 0 1 83 95 Z"
              fill={`url(#n-moon-${gradientId})`}
              opacity="0.95"
            />

            {/* Reflejo de luz */}
            <path
              d="M 48 54 C 46 74 54 99 72 110"
              fill="none"
              stroke="#ffffff"
              strokeWidth="3"
              strokeLinecap="round"
              opacity="0.3"
            />

            {/* GORRITO DE DORMIR VERDE ESMERALDA Y POMPÓN AMARILLO */}
            <g
              className="transition-all duration-300 ease-out origin-[80px_45px]"
              style={{
                transform: isPasswordFocused ? 'translate(0px, 20px) scaleY(1.15)' : 'translate(0, 0)',
              }}
            >
              {/* Cono del gorrito con caída a la izquierda */}
              <path
                d="M 40 44 Q 50 14 26 22 Q 40 10 90 20 L 118 44 Z"
                fill={`url(#n-hat-${gradientId})`}
                stroke="#047857"
                strokeWidth="1.5"
              />
              {/* Franja de borrega / base amarilla clara */}
              <ellipse cx="79" cy="44" rx="40" ry="6" fill="#fef08a" stroke="#f59e0b" strokeWidth="1" />
              {/* Pompón colgante Amarillo Dorado */}
              <circle cx="24" cy="23" r="7.5" fill={`url(#n-moon-${gradientId})`} stroke="#10b981" strokeWidth="1.5" />
              <circle cx="23" cy="21" r="2" fill="#ffffff" />
            </g>

            {/* Mejillas */}
            <ellipse cx="55" cy="82" rx="6" ry="3.5" fill="#fde047" opacity="0.6" />
            <ellipse cx="105" cy="82" rx="6" ry="3.5" fill="#fde047" opacity="0.6" />

            {/* Ojos */}
            {!isPasswordFocused ? (
              <g className="transition-transform duration-150" style={{ transform: `translate(${eyeShiftX}px, ${eyeShiftY}px)` }}>
                <circle cx="64" cy="70" r="8" fill="#ffffff" />
                <circle cx="64" cy="70" r="5" fill="#0f172a" />
                <circle cx="62" cy="68" r="2.2" fill="#ffffff" />

                {isSuccess ? (
                  <path d="M 90 70 Q 96 64 102 70" fill="none" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
                ) : (
                  <>
                    <circle cx="96" cy="70" r="8" fill="#ffffff" />
                    <circle cx="96" cy="70" r="5" fill="#0f172a" />
                    <circle cx="94" cy="68" r="2.2" fill="#ffffff" />
                  </>
                )}
              </g>
            ) : (
              <g>
                <path d="M 58 70 Q 64 76 70 70" fill="none" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
                <path d="M 90 70 Q 96 76 102 70" fill="none" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
              </g>
            )}

            {/* Boca */}
            {hasError ? (
              <ellipse cx="80" cy="86" rx="4.5" ry="6" fill="#0f172a" />
            ) : isSuccess ? (
              <path d="M 72 82 Q 80 94 88 82 Z" fill="#fbbf24" stroke="#0f172a" strokeWidth="1.5" />
            ) : isPasswordFocused ? (
              <path d="M 75 82 Q 80 86 85 82" fill="none" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
            ) : (
              <path d="M 74 81 Q 80 89 86 81" fill="none" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
            )}

            {/* Manitas (Amarillo Oro con ribete Verde) */}
            <g
              className="transition-all duration-300 ease-out origin-[45px_97px]"
              style={{
                transform: isPasswordFocused ? 'translate(15px, -20px) rotate(-15deg)' : 'translate(0, 0)',
              }}
            >
              <ellipse cx="48" cy="92" rx="9" ry="7" fill={`url(#n-moon-${gradientId})`} stroke="#10b981" strokeWidth="1.5" />
              <ellipse cx="46" cy="90" rx="7" ry="5" fill="#ffffff" opacity="0.6" />
            </g>

            <g
              className="transition-all duration-300 ease-out origin-[115px_97px]"
              style={{
                transform: isPasswordFocused ? 'translate(-15px, -20px) rotate(15deg)' : 'translate(0, 0)',
              }}
            >
              <ellipse cx="112" cy="92" rx="9" ry="7" fill={`url(#n-moon-${gradientId})`} stroke="#10b981" strokeWidth="1.5" />
              <ellipse cx="114" cy="90" rx="7" ry="5" fill="#ffffff" opacity="0.6" />
            </g>
          </svg>
        </>
      )}
    </div>
  );
}
