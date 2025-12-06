// Datumsformatierung Utilities

export const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatDateFull = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatRelativeDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffSec < 60) return 'Gerade eben';
  if (diffMin < 60) return `Vor ${diffMin} ${diffMin === 1 ? 'Minute' : 'Minuten'}`;
  if (diffHours < 24) return `Vor ${diffHours} ${diffHours === 1 ? 'Stunde' : 'Stunden'}`;
  if (diffDays < 7) return `Vor ${diffDays} ${diffDays === 1 ? 'Tag' : 'Tagen'}`;
  if (diffWeeks < 4) return `Vor ${diffWeeks} ${diffWeeks === 1 ? 'Woche' : 'Wochen'}`;
  return `Vor ${diffMonths} ${diffMonths === 1 ? 'Monat' : 'Monaten'}`;
};
