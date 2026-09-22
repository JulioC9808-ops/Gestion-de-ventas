import { useEffect, useState } from 'react';
import { useData, DEFAULT_ANNOUNCEMENT_URL } from '@/contexts/DataContext';
import { fetchAnnouncement, type Announcement } from '@/lib/announcements';
import { Bell, ExternalLink, X } from 'lucide-react';

const CHECK_INTERVAL_MS = 2 * 60 * 60 * 1000; // cada 2 horas
const STORAGE_KEY = 'gv_last_announcement_id';

export default function AnnouncementChecker() {
  const { settings } = useData();
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const announcementUrl = settings.announcementUrl || DEFAULT_ANNOUNCEMENT_URL;

  useEffect(() => {
    if (!navigator.onLine || !announcementUrl) return;

    const check = () => {
      fetchAnnouncement(announcementUrl)
        .then(data => {
          if (!data || !data.active || !data.id || !data.message) return;
          const lastShown = localStorage.getItem(STORAGE_KEY);
          if (lastShown === data.id) return;
          
          setAnnouncement(data);
        })
        .catch(error => {
          console.warn('No se pudo comprobar el aviso:', error instanceof Error ? error.message : error);
        });
    };

    check();
    const interval = setInterval(check, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [announcementUrl]);

  if (!announcement) return null;

  const handleDismiss = () => {
    if (announcement.id) {
      localStorage.setItem(STORAGE_KEY, announcement.id);
    }
    setAnnouncement(null);
  };

  const handleAction = () => {
    if (announcement.url) {
      window.open(announcement.url, '_blank');
    }
    handleDismiss();
  };

  return (
    <div
      id="announcement-floating-card"
      className="fixed bottom-4 right-4 z-50 max-w-sm w-[calc(100vw-2rem)] bg-white border border-blue-500 rounded-2xl shadow-xl p-3.5 flex flex-col gap-2.5 animate-in fade-in slide-in-from-bottom-3 duration-200"
    >
      <div className="flex items-start gap-3">
        {settings.logoUrl ? (
          <img
            src={settings.logoUrl}
            alt="Logo"
            className="w-10 h-10 rounded-xl object-contain shrink-0 border border-slate-100 bg-slate-50 p-1"
          />
        ) : (
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
            <Bell className="w-5 h-5" />
          </div>
        )}

        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center justify-between gap-1">
            <h4 className="text-sm font-bold text-slate-900 leading-tight">
              {announcement.title || 'Aviso del Sistema'}
            </h4>
            <button
              onClick={handleDismiss}
              className="text-slate-400 hover:text-slate-600 p-0.5 rounded-lg transition-colors"
              title="Cerrar aviso"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed whitespace-pre-line">
            {announcement.message}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
        <button
          onClick={handleDismiss}
          className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          Cerrar
        </button>

        {announcement.url && (
          <button
            onClick={handleAction}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <span>{announcement.urlLabel || 'Ver más'}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
