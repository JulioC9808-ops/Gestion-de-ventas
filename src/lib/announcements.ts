export interface Announcement {
  id?: string;
  title?: string;
  message?: string;
  active?: boolean;
  type?: 'info' | 'warning' | 'success' | 'destructive';
  url?: string;
  urlLabel?: string;
}

export async function fetchAnnouncement(url: string): Promise<Announcement | null> {
  const finalUrl = `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`;
  const response = await fetch(finalUrl, { cache: 'no-store' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as Announcement;
}
