/**
 * Utilidades para saludo humanizado según la hora del día y turno de trabajo.
 */

export interface ShiftGreeting {
  greeting: string;
  shiftName: string;
  periodText: string;
  icon: string;
  motivationalMessage: string;
}

export function getShiftGreeting(name?: string): ShiftGreeting {
  const hour = new Date().getHours();
  const displayName = name ? `, ${name}` : '';

  if (hour >= 5 && hour < 12) {
    return {
      greeting: `¡Buenos días${displayName}!`,
      shiftName: 'Turno Mañana',
      periodText: 'la mañana',
      icon: '☀️',
      motivationalMessage: 'Que tengas una excelente jornada y ventas productivas hoy.',
    };
  } else if (hour >= 12 && hour < 19) {
    return {
      greeting: `¡Buenas tardes${displayName}!`,
      shiftName: 'Turno Tarde',
      periodText: 'la tarde',
      icon: '🌤️',
      motivationalMessage: 'Continuemos con una exitosa sesión de trabajo.',
    };
  } else {
    return {
      greeting: `¡Buenas noches${displayName}!`,
      shiftName: 'Turno Noche',
      periodText: 'la noche',
      icon: '🌙',
      motivationalMessage: 'Éxitos en el cierre y atención de este turno.',
    };
  }
}
