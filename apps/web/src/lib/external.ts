export function openExternalUrl(url: string): void {
  const opened = window.open(url, '_blank', 'noopener,noreferrer');
  if (opened) {
    opened.opener = null;
  }
}
