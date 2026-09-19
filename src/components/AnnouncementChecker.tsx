import { useEffect } from 'react';
import { toast } from 'sonner';

const ANNOUNCEMENT_URL = 'https://raw.githubusercontent.com/JulioC9808-ops/Sistema-Updates/main/announcement.json';
const CHECK_INTERVAL_MS = 2 * 60 * 60 * 1000; // cada 2 horas mientras la app está abierta
const STORAGE_KEY = 'gv_last_announcement_id';

interface Announcement {
  id?: string;
  title?: string;
  message?: string;
  active?: boolean;
}

function checkAnnouncement() {
  if (!navigator.onLine) return;

  fetch(`${ANNOUNCEMENT_URL}?t=${Date.now()}`, { cache: 'no-store' })
    .then(response => {
      if (!response.ok) throw new Error(`Respuesta ${response.status}`);
      return response.json() as Promise<Announcement>;
    })
    .then(data => {
      if (!data.active || !data.id || !data.message) return;
      const lastShown = localStorage.getItem(STORAGE_KEY);
      if (lastShown === data.id) return;
      localStorage.setItem(STORAGE_KEY, data.id);
      toast.info(data.title || 'Aviso', {
        description: data.message,
        duration: 15000,
      });
    })
    .catch(error => {
      console.warn('No se pudo comprobar el aviso:', error instanceof Error ? error.message : error);
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
