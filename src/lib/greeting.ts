/**
 * Utilidades para saludo humanizado, rotación diaria de frases motivacionales
 * multilingüe (Español, Português, English, Français, Italiano) sin autor
 * y búsqueda/traducción automática en internet según el turno de trabajo (Mañana / Tarde / Noche).
 */

export interface ShiftGreeting {
  greeting: string;
  shiftName: string;
  periodText: string;
  icon: string;
  motivationalMessage: string;
  language: string;
  source?: 'online' | 'daily_collection';
}

export type ShiftPeriod = 'morning' | 'afternoon' | 'night';

export interface QuoteLanguageOption {
  code: string;
  label: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: QuoteLanguageOption[] = [
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
];

// Colección curada de frases motivacionales por idioma y turno (100% SIN AUTOR)
const QUOTES_DB: Record<string, Record<ShiftPeriod, string[]>> = {
  es: {
    morning: [
      'Cada mañana es una nueva oportunidad para superar nuestras metas de ventas y brindar la mejor atención.',
      'La energía y la amabilidad con el primer cliente marcan el ritmo del éxito de toda la jornada.',
      'El secreto para salir adelante es comenzar cada día con entusiasmo y determinación.',
      'Hoy es un gran día para ofrecer un servicio impecable y hacer crecer nuestro negocio.',
      'Una actitud positiva por la mañana transforma cualquier reto en una gran venta.',
      'La excelencia diaria no es casualidad, es la suma de pequeños esfuerzos en cada turno.',
      'Organiza tu puesto, sonríe y prepárate para una jornada llena de buenos resultados.',
      'Cada cliente satisfecho esta mañana es una recomendación valiosa para el negocio.',
      'El éxito en las ventas llega cuando la buena preparación se une a una sonrisa sincera.',
      'Comienza con determinación este turno y lo terminarás con gran satisfacción.',
      'Tu dedicación y constancia de hoy construyen la solidez de nuestro negocio mañana.',
      'La clave de una mañana productiva es el orden, la agilidad y el buen trato.',
    ],
    afternoon: [
      'Mantén el ritmo y la concentración: la tarde es el momento clave para cerrar con éxito.',
      'Una buena atención en la tarde convierte visitas casuales en clientes fieles y satisfechos.',
      'El éxito de la jornada se define en cómo aprovechamos con energía las horas de la tarde.',
      'Cada transacción bien atendida suma al resultado positivo de todo el equipo.',
      'La paciencia, el orden y la rapidez hacen que esta tarde sea productiva y fluida.',
      'El trabajo en equipo y la buena vibra mantienen el negocio activo y brillante.',
      'Aprovecha cada oportunidad de la tarde para ofrecer el mejor servicio.',
      'Las grandes metas se alcanzan paso a paso, producto a producto y cliente a cliente.',
      'Un servicio cálido y eficiente a mitad del día alegra la experiencia de quien nos visita.',
      'Sigue adelante con fuerza: cada venta cuenta y premia tu esfuerzo continuo.',
    ],
    night: [
      'Cierre de turno impecable: cuentas claras, orden y la satisfacción del deber cumplido.',
      'La tranquilidad de la noche llega con un inventario exacto y una caja bien cuadrada.',
      'Gracias por tu entrega y esfuerzo en este turno. El descanso bien merecido te espera.',
      'Un día productivo concluye con un balance transparente y la mente tranquila.',
      'Revisa cada detalle con calma: la excelencia se demuestra en el cierre final.',
      'El éxito del día de hoy es el cimiento sólido de los triunfos de mañana.',
      'Gran trabajo en este turno. Cierra con orgullo y prepárate para un nuevo amanecer.',
    ],
  },
  pt: {
    morning: [
      'Cada manhã é uma nova oportunidade para superar metas de vendas e encantar os clientes.',
      'A energia e o bom atendimento com o primeiro cliente definem o sucesso de todo o dia.',
      'Comece este turno com determinação e foco: hoje será um dia de ótimos resultados.',
      'A organização e o sorriso abrem portas para vendas excelentes nesta manhã.',
      'O segredo do sucesso no comércio é a dedicação diária e o cuidado com cada detalhe.',
      'Hoje é um dia especial para oferecer o melhor atendimento e valorizar nosso negócio.',
      'Uma atitude positiva pela manhã transforma qualquer desafio em uma grande conquista.',
      'Organize seu espaço, atenda com alegria e aproveite todas as oportunidades do dia.',
    ],
    afternoon: [
      'Mantenha o ritmo e o entusiasmo: a tarde é decisiva para alcançar grandes resultados.',
      'Um atendimento ágil e atencioso faz toda a diferença para os clientes da tarde.',
      'Cada venda bem atendida fortalece o crescimento do nosso negócio.',
      'Foco e simpatia no período da tarde garantem clientes satisfeitos e fiéis.',
      'O trabalho em equipe e a dedicação constante constroem o sucesso da nossa jornada.',
      'Aproveite a tarde para superar as expectativas com atenção e rapidez.',
    ],
    night: [
      'Fechamento de turno impecável: caixa conferido, estoque correto e sensação de dever cumprido.',
      'Obrigado pelo seu empenho e dedicação hoje. Bom descanso e até o próximo turno.',
      'O sucesso de hoje é o ponto de partida para as grandes conquistas de amanhã.',
      'Conclua este turno com a tranquilidade de contas exatas e um trabalho exemplar.',
      'Um dia produtivo termina com organização, transparência e orgulho pelo dever cumprido.',
    ],
  },
  en: {
    morning: [
      'Every morning is a fresh opportunity to exceed our sales goals and deliver great service.',
      'Energy, kindness, and focus with your first customer set the tone for a successful day.',
      'The secret of getting ahead is getting started with enthusiasm and confidence.',
      'Today is a great day to deliver excellent customer service and help the business grow.',
      'A positive morning mindset turns every interaction into a fruitful sale.',
      'Organize your space, smile, and get ready for a highly rewarding shift.',
      'Every satisfied customer this morning builds lasting loyalty for our store.',
    ],
    afternoon: [
      'Keep the momentum going strong: the afternoon is where great daily results are achieved.',
      'Kind and attentive afternoon service turns casual shoppers into regular customers.',
      'Stay sharp and focused: teamwork and steady dedication make this shift a success.',
      'Great achievements happen step by step, one sale and one satisfied smile at a time.',
      'Warm and efficient customer care in the afternoon brings out the best in our business.',
    ],
    night: [
      'Flawless shift closing: accurate numbers, neat records, and pride in a job well done.',
      'Peace of mind at night comes from balanced accounts and precise stock counts.',
      'Thank you for your hard work and dedication today. A well-earned rest awaits you.',
      'Today’s accomplishments build the foundation for tomorrow’s ongoing success.',
    ],
  },
  fr: {
    morning: [
      'Chaque matin est une nouvelle chance de dépasser nos objectifs et d’offrir le meilleur service.',
      'L’énergie positive et le sourire dès le premier client garantissent le succès de la journée.',
      'Commencez ce shift avec enthousiasme et précision pour faire grandir notre activité.',
      'Un accueil chaleureux le matin transforme chaque visiteur en client fidèle.',
    ],
    afternoon: [
      'Gardez le rythme et la concentration: l’après-midi est le moment clé pour réussir.',
      'Un service attentionné et rapide transforme chaque visite en vente réussie.',
      'La constance et la bonne humeur de l’après-midi assurent d’excellents résultats.',
    ],
    night: [
      'Clôture de shift impeccable: comptes précis, caisse équilibrée et satisfaction du travail accompli.',
      'Merci pour votre dévouement aujourd’hui. Un repos bien mérité vous attend.',
      'Le travail bien fait aujourd’hui prépare les réussites de demain.',
    ],
  },
  it: {
    morning: [
      'Ogni mattina è una nuova opportunità per superare i nostri obiettivi di vendita.',
      'Un sorriso e un servizio cordiale fin dal primo cliente garantiscono una giornata di successo.',
      'Inizia questo turno con determinazione ed energia: oggi sarà un grande giorno.',
      'La cura e l’attenzione del mattino aprono le porte a risultati straordinari.',
    ],
    afternoon: [
      'Mantieni il ritmo e la concentrazione: il pomeriggio è decisivo per raggiungere ottimi risultati.',
      'Un servizio attento e professionale trasforma ogni contatto in un cliente soddisfatto.',
      'L’impegno costante e la rapidità nel pomeriggio fanno la differenza.',
    ],
    night: [
      'Chiusura turno impeccabile: cassa precisa, conti in ordine e soddisfazione per il lavoro svolto.',
      'Grazie per l’impegno e la dedizione dimostrati in questo turno. Buon riposo.',
      'I successi di oggi sono le fondamenta solide per il lavoro di domani.',
    ],
  },
};

// Saludos localizados por turno e idioma
const GREETINGS_DB: Record<string, Record<ShiftPeriod, { greeting: string; shiftName: string; periodText: string; icon: string; prefix: string }>> = {
  es: {
    morning: { greeting: '¡Buenos días', shiftName: 'Turno Mañana', periodText: 'la mañana', icon: '☀️', prefix: '☀️ Enfoque de la mañana: ' },
    afternoon: { greeting: '¡Buenas tardes', shiftName: 'Turno Tarde', periodText: 'la tarde', icon: '🌤️', prefix: '🌤️ Impulso de la tarde: ' },
    night: { greeting: '¡Buenas noches', shiftName: 'Turno Noche', periodText: 'la noche', icon: '🌙', prefix: '🌙 Reflexión de cierre: ' },
  },
  pt: {
    morning: { greeting: '¡Bom dia', shiftName: 'Turno da Manhã', periodText: 'a manhã', icon: '☀️', prefix: '☀️ Foco da manhã: ' },
    afternoon: { greeting: '¡Boa tarde', shiftName: 'Turno da Tarde', periodText: 'a tarde', icon: '🌤️', prefix: '🌤️ Impulso da tarde: ' },
    night: { greeting: '¡Boa noite', shiftName: 'Turno da Noite', periodText: 'a noite', icon: '🌙', prefix: '🌙 Reflexão da noite: ' },
  },
  en: {
    morning: { greeting: 'Good morning', shiftName: 'Morning Shift', periodText: 'the morning', icon: '☀️', prefix: '☀️ Morning focus: ' },
    afternoon: { greeting: 'Good afternoon', shiftName: 'Afternoon Shift', periodText: 'the afternoon', icon: '🌤️', prefix: '🌤️ Afternoon drive: ' },
    night: { greeting: 'Good evening', shiftName: 'Night Shift', periodText: 'the night', icon: '🌙', prefix: '🌙 Night closing note: ' },
  },
  fr: {
    morning: { greeting: 'Bonjour', shiftName: 'Shift du Matin', periodText: 'le matin', icon: '☀️', prefix: '☀️ Focus du matin: ' },
    afternoon: { greeting: 'Bon après-midi', shiftName: 'Shift de l’Après-midi', periodText: 'l’après-midi', icon: '🌤️', prefix: '🌤️ Élan de l’après-midi: ' },
    night: { greeting: 'Bonsoir', shiftName: 'Shift du Soir', periodText: 'le soir', icon: '🌙', prefix: '🌙 Pensée du soir: ' },
  },
  it: {
    morning: { greeting: 'Buongiorno', shiftName: 'Turno Mattina', periodText: 'la mattina', icon: '☀️', prefix: '☀️ Energia del mattino: ' },
    afternoon: { greeting: 'Buon pomeriggio', shiftName: 'Turno Pomeriggio', periodText: 'il pomeriggio', icon: '🌤️', prefix: '🌤️ Slancio del pomeriggio: ' },
    night: { greeting: 'Buonasera', shiftName: 'Turno Notte', periodText: 'la notte', icon: '🌙', prefix: '🌙 Riflessione di chiusura: ' },
  },
};

export function getQuoteLanguages(): string[] {
  if (typeof window === 'undefined') return ['es'];
  try {
    const raw = localStorage.getItem('pos_quote_languages');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // Fallback default
  }
  return ['es'];
}

export function setQuoteLanguages(langs: string[]): void {
  if (typeof window === 'undefined') return;
  const valid = langs.filter(l => SUPPORTED_LANGUAGES.some(s => s.code === l));
  const finalLangs = valid.length > 0 ? valid : ['es'];
  try {
    localStorage.setItem('pos_quote_languages', JSON.stringify(finalLangs));
  } catch {
    // Ignorar error de persistencia
  }
}

export function getCurrentPeriod(): ShiftPeriod {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 19) return 'afternoon';
  return 'night';
}

function getDayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

function getDateKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Traduce texto de forma segura y directa al idioma destino si es necesario.
 */
async function translateQuote(text: string, targetLang: string): Promise<string> {
  if (targetLang === 'en' || !text) return text;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && Array.isArray(data[0])) {
        const translated = data[0].map((item: unknown) => (Array.isArray(item) ? item[0] : '')).join('');
        if (translated && translated.trim().length > 0) {
          return translated.trim();
        }
      }
    }
  } catch {
    // Fallback si falla traducción
  }
  return text;
}

/**
 * Obtiene la frase diaria para el turno actual según los idiomas seleccionados por el usuario.
 * NO incluye autor, únicamente la frase motivacional pura.
 */
export function getDailyQuote(
  period: ShiftPeriod,
  preferredLangs?: string[]
): { quote: string; language: string; source: 'online' | 'daily_collection' } {
  const langs = preferredLangs && preferredLangs.length > 0 ? preferredLangs : getQuoteLanguages();
  const dayIndex = getDayOfYear();
  
  // Selecciona el idioma activo del día estrictamente entre los idiomas elegidos
  const activeLangCode = langs[dayIndex % langs.length] || 'es';
  const langKey = QUOTES_DB[activeLangCode] ? activeLangCode : 'es';
  const dateKey = getDateKey();
  const cacheKey = `pos_daily_quote_v2_${dateKey}_${period}_${langKey}`;

  // 1. Revisar caché online del día para este idioma y turno
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed?.quote && parsed?.language === langKey) {
        return { quote: parsed.quote, language: langKey, source: 'online' };
      }
    }
  } catch {
    // Ignorar error al leer caché
  }

  // 2. Rotación determinista según el día del año y turno en el idioma correspondiente
  const list = QUOTES_DB[langKey][period] || QUOTES_DB.es[period];
  const quote = list[dayIndex % list.length];

  return {
    quote,
    language: langKey,
    source: 'daily_collection',
  };
}

/**
 * Busca frases nuevas en internet cuando hay conexión disponible
 * y las traduce y almacena en la caché del día para el turno e idioma respectivo (SIN AUTOR).
 */
export async function fetchOnlineQuote(period?: ShiftPeriod, preferredLangs?: string[]): Promise<string | null> {
  const activePeriod = period || getCurrentPeriod();
  const langs = preferredLangs && preferredLangs.length > 0 ? preferredLangs : getQuoteLanguages();
  const dayIndex = getDayOfYear();
  const activeLangCode = langs[dayIndex % langs.length] || 'es';
  const dateKey = getDateKey();
  const cacheKey = `pos_daily_quote_v2_${dateKey}_${activePeriod}_${activeLangCode}`;

  if (typeof window === 'undefined' || !navigator.onLine) {
    return null;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch('https://dummyjson.com/quotes/random', {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) return null;
    const data = await res.json();

    if (data && data.quote) {
      // Limpiar y preparar frase original (en inglés)
      const rawQuote = String(data.quote).trim().replace(/^["“]|["”]$/g, '');
      
      // Traducir al idioma seleccionado si es diferente de inglés
      let translatedQuote = rawQuote;
      if (activeLangCode !== 'en') {
        translatedQuote = await translateQuote(rawQuote, activeLangCode);
      }

      // Añadir prefijo de turno según el idioma
      const greetingInfo = (GREETINGS_DB[activeLangCode] || GREETINGS_DB.es)[activePeriod];
      const formattedQuote = `${greetingInfo.prefix}“${translatedQuote}”`;

      const quoteObj = {
        quote: formattedQuote,
        language: activeLangCode,
        fetchedAt: Date.now(),
      };

      try {
        localStorage.setItem(cacheKey, JSON.stringify(quoteObj));
      } catch {
        // Ignorar error de cuota
      }

      return formattedQuote;
    }
  } catch {
    // Si falla la red, el sistema usa el catálogo determinista offline
  }
  return null;
}

/**
 * Retorna el saludo completo con la frase del día para el usuario (SIN AUTOR).
 */
export function getShiftGreeting(name?: string, preferredLangs?: string[]): ShiftGreeting {
  const period = getCurrentPeriod();
  const daily = getDailyQuote(period, preferredLangs);
  const langKey = daily.language;
  const langData = GREETINGS_DB[langKey] || GREETINGS_DB.es;
  const periodData = langData[period];

  const displayName = name ? (langKey === 'en' ? `, ${name}!` : `! ${name}`) : (langKey === 'en' ? '!' : '!');

  const greetingText = `${periodData.greeting}${displayName}`;

  return {
    greeting: greetingText,
    shiftName: periodData.shiftName,
    periodText: periodData.periodText,
    icon: periodData.icon,
    motivationalMessage: daily.quote,
    language: daily.language,
    source: daily.source,
  };
}
