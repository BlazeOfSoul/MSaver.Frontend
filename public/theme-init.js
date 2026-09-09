// Apply the saved preference before the first paint, including cached PWA starts.
try {
    const value = localStorage.getItem('msaver.theme');
    const light =
        value === 'light' ||
        (value === 'system' && !matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = light ? 'light' : 'dark';
} catch {
    /* The default theme remains usable without browser storage. */
}
