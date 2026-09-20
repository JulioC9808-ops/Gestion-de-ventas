import { useEffect } from 'react';
import { toast } from 'sonner';
import { useData, DEFAULT_ANNOUNCEMENT_URL } from '@/contexts/DataContext';
import { fetchAnnouncement } from '@/lib/announcements';

const CHECK_INTERVAL_MS = 2 * 60 * 60 * 1000; // cada 2 horas mientras la app está abierta
const STORAGE_KEY = 'gv_last_announcement_id';

export default function AnnouncementChecker() {
  const { settings } = useData();
  const announcementUrl = settings.announcementUrl || DEFAULT_ANNOUNCEMENT_URL;

  useEffect(() => {
    if (!navigator.onLine || !announcementUrl) return;

    const check = () => {
      fetchAnnouncement(announcementUrl)
        .then(data => {
          if (!data || !data.active || !data.id || !data.message) return;
          const lastShown = localStorage.getItem(STORAGE_KEY);
          if (lastShown === data.id) return;
          localStorage.setItem(STORAGE_KEY, data.id);

          const action = data.url ? {
            label: data.urlLabel || 'Ver más',
            onClick: () => window.open(data.url, '_blank'),
          } : undefined;

          if (data.type === 'warning') {
            toast.warning(data.title || 'Aviso del Sistema', {
              description: data.message,
              duration: 20000,
              action,
            });
          } else if (data.type === 'success') {
            toast.success(data.title || 'Aviso del Sistema', {
              description: data.message,
              duration: 20000,
              action,
            });
          } else {
            toast.info(data.title || 'Aviso del Sistema', {
              description: data.message,
              duration: 20000,
              action,
            });
          }
        })
        .catch(error => {
          console.warn('No se pudo comprobar el aviso del sistema:', error instanceof Error ? error.message : error);
        });
    };

    check();
    const interval = setInterval(check, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [announcementUrl]);

  return null;
}
