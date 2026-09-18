import { useEffect } from 'react';
import { toast } from 'sonner';

const ANNOUNCEMENT_URL = 'https://raw.githubusercontent.com/JulioC9808-ops/Sistema-Updates/main/announcement.json';
const CHECK_INTERVAL_MS = 2 * 60 * 60 * 1000;
const STORAGE_KEY = 'gv_last_announcement_id';

interface Announcement {
  id?: string;
  title?: string;
  message?: string;
  active?: boolean;
}

function checkAnnouncement() {
  const diag: string[] = [];
  diag.push('onLine=' + navigator.onLine);

  if (!navigator.onLine) {
    alert('[DIAG] ' + diag.join(', '));
    return;
  }

  fetch(`${ANNOUNCEMENT_URL}?t=${Date.now()}`, { cache: 'no-store' })
    .then(response => {
      diag.push('HTTP=' + response.status);
      if (!response.ok) throw new Error(`Respuesta ${response.status}`);
      return response.json() as Promise<Announcement>;
    })
    .then(data => {
      diag.push(`id=${data.id ?? '(sin id)'}, active=${String(data.active)}`);
      const lastShown = localStorage.getItem(STORAGE_KEY);
      diag.push(`yaMostrado=${lastShown === data.id ? 'SÍ' : 'no'}`);

      if (!data.active || !data.id || !data.message) {
        alert('[DIAG] ' + diag.join(', ') + ' → NO muestra (datos incompletos)');
        return;
      }
      if (lastShown === data.id) {
        alert('[DIAG] ' + diag.join(', ') + ' → NO muestra (ya estaba marcado)');
        return;
      }
      localStorage.setItem(STORAGE_KEY, data.id);
      toast.info(data.title || 'Aviso', {
        description: data.message,
        duration: 15000,
      });
      alert('[DIAG] ' + diag.join(', ') + ' → disparó el toast. ¿Lo viste?');
    })
    .catch(error => {
      diag.push('ERROR=' + (error instanceof Error ? error.message : String(error)));
      alert('[DIAG] ' + diag.join(', '));
    });
}

export default function AnnouncementChecker() {
  useEffect(() => {
    checkAnnouncement();
    const interval = setInterval(checkAnnouncement, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);
  return null;
}
