let offline = !navigator.onLine;

export function isOffline() {
  return offline;
}

function setOfflineBanner(visible) {
  offline = visible;
  document.getElementById('offline-banner')?.classList.toggle('hidden', !visible);
  document.body.classList.toggle('has-offline-banner', visible);
}

export function reportConnectionSuccess() {
  if (navigator.onLine) setOfflineBanner(false);
}

export function reportConnectionError(error) {
  const msg = (error?.message || '').toLowerCase();
  if (!navigator.onLine || msg.includes('fetch') || msg.includes('network') || msg.includes('failed')) {
    setOfflineBanner(true);
  }
}

export function initNetworkMonitor() {
  setOfflineBanner(!navigator.onLine);

  window.addEventListener('online', () => setOfflineBanner(false));
  window.addEventListener('offline', () => setOfflineBanner(true));

  window.addEventListener('network-offline', () => setOfflineBanner(true));
  window.addEventListener('network-online', () => {
    if (navigator.onLine) setOfflineBanner(false);
  });
}
