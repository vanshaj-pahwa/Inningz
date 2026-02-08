/**
 * Web Share API utilities for share card functionality
 */

/**
 * Check if Web Share API is available and supports file sharing
 */
export function canShareFiles(): boolean {
  if (typeof navigator === 'undefined') return false;
  if (!navigator.share) return false;
  if (!navigator.canShare) return true; // Assume files are supported if canShare doesn't exist

  // Test with a dummy file to check file sharing support
  try {
    const testFile = new File(['test'], 'test.png', { type: 'image/png' });
    return navigator.canShare({ files: [testFile] });
  } catch {
    return false;
  }
}

/**
 * Check if basic Web Share API is available
 */
export function canShare(): boolean {
  if (typeof navigator === 'undefined') return false;
  return !!navigator.share;
}

/**
 * Share an image file using Web Share API
 */
export async function shareImageFile(
  blob: Blob,
  filename: string,
  title: string,
  text?: string
): Promise<boolean> {
  if (!canShareFiles()) {
    return false;
  }

  try {
    const file = new File([blob], filename, { type: 'image/png' });
    await navigator.share({
      files: [file],
      title,
      text: text || title,
    });
    return true;
  } catch (error) {
    // User cancelled or share failed
    if (error instanceof Error && error.name === 'AbortError') {
      return false;
    }
    throw error;
  }
}

/**
 * Share text/URL using Web Share API (fallback when file sharing not supported)
 */
export async function shareText(
  title: string,
  text: string,
  url?: string
): Promise<boolean> {
  if (!canShare()) {
    return false;
  }

  try {
    await navigator.share({
      title,
      text,
      url,
    });
    return true;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return false;
    }
    throw error;
  }
}

/**
 * Download a blob as a file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate a filename for the share card
 */
export function generateShareFilename(matchTitle: string, type: string = 'score'): string {
  const sanitized = matchTitle
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 50);

  const timestamp = Date.now();
  return `inningz-${type}-${sanitized}-${timestamp}.png`;
}
