import { toast } from 'sonner';

export interface GithubReleaseAsset {
  name: string;
  browser_download_url: string;
  size: number;
}

export interface GithubRelease {
  id: number;
  tag_name: string;
  name?: string;
  html_url: string;
  draft: boolean;
  prerelease: boolean;
  body?: string;
  published_at?: string;
  assets?: GithubReleaseAsset[];
}

export function parseGithubRepository(url: string): { owner: string; repo: string } | null {
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

export function extractSemver(tagOrName: string): string | null {
  const match = tagOrName.match(/(\d+\.\d+(?:\.\d+)?)/);
  return match ? match[1] : null;
}

export function compareVersions(left: string, right: string): number {
  const normalize = (value: string) => value.replace(/^v/i, '').split('.').map(part => Number(part) || 0);
  const a = normalize(left);
  const b = normalize(right);
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const difference = (a[index] || 0) - (b[index] || 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

export async function checkPCUpdates(githubUpdatesUrl: string, manual = false): Promise<{
  hasUpdate: boolean;
  release?: GithubRelease;
  newVersion?: string;
  error?: string;
}> {
  if (!navigator.onLine) {
    if (manual) toast.error('Sin conexión a internet.');
    return { hasUpdate: false, error: 'offline' };
  }

  const repository = parseGithubRepository(githubUpdatesUrl);
  if (!repository) {
    if (manual) toast.error('La URL del repositorio de GitHub no es válida.');
    return { hasUpdate: false, error: 'invalid_repo' };
  }

  try {
    const res = await fetch(`https://api.github.com/repos/${repository.owner}/${repository.repo}/releases?per_page=15`, {
      headers: { Accept: 'application/vnd.github+json' },
    });

    if (!res.ok) {
      const fallback = await fetch(`https://api.github.com/repos/${repository.owner}/${repository.repo}/releases/latest`, {
        headers: { Accept: 'application/vnd.github+json' },
      });
      if (!fallback.ok) throw new Error(`GitHub respondió con estado ${res.status}`);
      const single = (await fallback.json()) as GithubRelease;
      return evaluateReleases([single], manual);
    }

    const releases = (await res.json()) as GithubRelease[];
    return evaluateReleases(releases, manual);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (manual) {
      toast.error('No se pudo verificar actualizaciones en GitHub', { description: msg });
    }
    return { hasUpdate: false, error: msg };
  }
}

function evaluateReleases(releases: GithubRelease[], manual: boolean): {
  hasUpdate: boolean;
  release?: GithubRelease;
  newVersion?: string;
} {
  const validReleases = releases.filter(r => !r.draft);
  for (const rel of validReleases) {
    const rawVer = extractSemver(rel.tag_name) || extractSemver(rel.name || '');
    if (!rawVer) continue;
    const isPureAndroid = rel.tag_name.toLowerCase() === 'android' &&
      !rel.assets?.some(a => a.name.endsWith('.exe') || a.name.endsWith('.yml') || a.name.endsWith('.zip'));
    if (isPureAndroid) continue;
    if (compareVersions(rawVer, __APP_VERSION__) > 0) {
      const exeAsset = rel.assets?.find(a => a.name.endsWith('.exe'));
      // Opt-in: preguntar Sí / No, nunca descargar sin permiso
      toast.info(`¡Nueva versión reciente disponible: ${rel.name || `v${rawVer}`}!`, {
        description: '¿Deseas descargarla ahora?',
        duration: 30000,
        closeButton: true,
        action: {
          label: 'Sí, descargar',
          onClick: () => {
            if (window.desktopBridge?.isElectron && window.desktopBridge?.updates?.check) {
              toast.info('Descargando actualización…', {
                description: 'Puedes seguir usando la app mientras se descarga.',
              });
              window.desktopBridge.updates.check().catch(() => {
                // Si el auto-updater falla, descargar el .EXE directo
                if (exeAsset) window.open(exeAsset.browser_download_url, '_blank');
              });
            } else if (exeAsset) {
              window.open(exeAsset.browser_download_url, '_blank');
            }
          },
        },
        cancel: { label: 'No', onClick: () => {} },
      });
      return { hasUpdate: true, release: rel, newVersion: rawVer };
    }
  }
  if (manual) {
    toast.success(`Tu programa está actualizado. Versión actual: v${__APP_VERSION__}`);
  }
  return { hasUpdate: false };
}
