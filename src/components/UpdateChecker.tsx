import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { useData } from '@/contexts/DataContext';
import { parseGithubRepository, checkPCUpdates } from '@/lib/updates';

const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000;

export default function UpdateChecker() {
  const { settings } = useData();

  useEffect(() => {
    // En Android las actualizaciones las maneja el sistema nativo con UpdateManager.
    // Este componente atiende PC / Electron y Web.
    if (Capacitor.isNativePlatform()) return;
    if (!navigator.onLine || !settings.githubUpdatesUrl) return;

    const repository = parseGithubRepository(settings.githubUpdatesUrl);
    if (!repository) return;

    const checkKey = `update_check_${repository.owner}_${repository.repo}`;
    const lastCheck = Number(localStorage.getItem(checkKey) || 0);
    if (Date.now() - lastCheck < CHECK_INTERVAL_MS) return;
    localStorage.setItem(checkKey, String(Date.now()));

    // Ejecutar verificación silenciosa
    checkPCUpdates(settings.githubUpdatesUrl, false).catch(error => {
      console.warn('Verificación en segundo plano no completada:', error);
    });
  }, [settings.githubUpdatesUrl]);

  return null;
}
