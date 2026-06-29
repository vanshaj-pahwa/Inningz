const KEY_LAST = 'inningz:nav:lastPathname';
const KEY_COUNT = 'inningz:nav:count';

export function recordNavigation(pathname: string): void {
    if (typeof window === 'undefined') return;
    try {
        const last = sessionStorage.getItem(KEY_LAST);
        if (pathname !== last) {
            const count = parseInt(sessionStorage.getItem(KEY_COUNT) || '0', 10);
            sessionStorage.setItem(KEY_COUNT, String(count + 1));
            sessionStorage.setItem(KEY_LAST, pathname);
        }
    } catch {
        // sessionStorage unavailable (private mode etc.) — fail silent
    }
}

export function hasInAppHistory(): boolean {
    if (typeof window === 'undefined') return false;
    try {
        const count = parseInt(sessionStorage.getItem(KEY_COUNT) || '0', 10);
        return count > 1;
    } catch {
        return false;
    }
}
