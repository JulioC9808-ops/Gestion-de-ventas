import { useEffect } from 'react';
import { toast } from 'sonner';
import { useData } from '@/contexts/DataContext';

const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

function parseGithubRepository(url: string): { owner: string; repo: string } | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== 'github.com') return null;
    const [owner, repo] = parsed.pathname.split('/').filter(Boolean);
    if (!owner || !repo) return null;
    return { owner, repo: repo.replace(/\.git$/, '') };
  } catch {
    return null;
  }
}

function compareVersions(left: string, right: string): number {
  const normalize = (value: string) => value.replace(/^v/i, '').split('.').map(part => Number(part) || 0);
  const a = normalize(left);
  const b = normalize(right);
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const difference = (a[index] || 0) - (b[index] || 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

export default function UpdateChecker() {
  const { settings } = useData();

  useEffect(() => {
    if (!navigator.onLine || !settings.githubUpdatesUrl) return;
    const repository = parseGithubRepository(settings.githubUpdatesUrl);
    if (!repository) return;

    const checkKey = `update_check_${repository.owner}_${repository.repo}`;
    const lastCheck = Number(localStorage.getItem(checkKey) || 0);
    if (Date.now() - lastCheck < CHECK_INTERVAL_MS) return;
    localStorage.setItem(checkKey, String(Date.now()));

    const controller = new AbortController();
    fetch(`https://api.github.com/repos/${repository.owner}/${repository.repo}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json' },
      signal: controller.signal,
    })
      .then(response => {
        if (!response.ok) throw new Error(`GitHub respondió ${response.status}`);
        return response.json() as Promise<{ tag_name?: string; html_url?: string; name?: string }>;
      })
      .then(release => {
        if (!release.tag_name || compareVersions(release.tag_name, __APP_VERSION__) <= 0) return;
        toast.info(`Nueva versión disponible: ${release.name || release.tag_name}`, {
          duration: 12000,
          action: release.html_url ? { label: 'Ver en GitHub', onClick: () => window.open(release.html_url, '_blank') } : undefined,
        });
      })
      .catch(error => {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.warn('No se pudo comprobar la actualización:', error.message);
        }
      });

    return () => controller.abort();
  }, [settings.githubUpdatesUrl]);

  return null;
}