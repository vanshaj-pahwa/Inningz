'use client';

import { useCallback, useState } from 'react';
import html2canvas from 'html2canvas';
import {
  canShareFiles,
  shareImageFile,
  downloadBlob,
  generateShareFilename,
} from '@/lib/share-utils';

interface UseShareCardReturn {
  isGenerating: boolean;
  isSharing: boolean;
  error: string | null;
  generateImage: (element: HTMLElement) => Promise<Blob | null>;
  downloadCard: (element: HTMLElement, matchTitle: string, cardType?: string) => Promise<void>;
  shareCard: (element: HTMLElement, matchTitle: string, cardType?: string) => Promise<void>;
  supportsNativeShare: boolean;
}

export function useShareCard(): UseShareCardReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supportsNativeShare = canShareFiles();

  const generateImage = useCallback(
    async (element: HTMLElement): Promise<Blob | null> => {
      setIsGenerating(true);
      setError(null);

      try {
        // Wait for fonts to load
        await document.fonts.ready;

        // Longer delay to ensure everything is rendered
        await new Promise(resolve => setTimeout(resolve, 100));

        const canvas = await html2canvas(element, {
          scale: 1,
          backgroundColor: '#09090b',
          useCORS: true,
          allowTaint: true,
          logging: false,
          width: 1080,
          height: 1080,
          // Use onclone to ensure the cloned element is properly styled
          onclone: (clonedDoc, clonedElement) => {
            // Reset any transforms that might affect rendering
            clonedElement.style.transform = 'none';
            clonedElement.style.position = 'relative';
            clonedElement.style.left = '0';
            clonedElement.style.top = '0';

            // Force all children to be visible
            const allElements = clonedElement.querySelectorAll('*');
            allElements.forEach((el) => {
              const htmlEl = el as HTMLElement;
              if (htmlEl.style) {
                htmlEl.style.visibility = 'visible';
                htmlEl.style.opacity = '1';
              }
            });
          },
        });

        return new Promise((resolve, reject) => {
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Failed to generate image'));
              }
            },
            'image/png',
            1.0
          );
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to generate image';
        setError(message);
        console.error('Image generation error:', err);
        return null;
      } finally {
        setIsGenerating(false);
      }
    },
    []
  );

  const downloadCard = useCallback(
    async (element: HTMLElement, matchTitle: string, cardType: string = 'score') => {
      const blob = await generateImage(element);
      if (!blob) return;

      const filename = generateShareFilename(matchTitle, cardType);
      downloadBlob(blob, filename);
    },
    [generateImage]
  );

  const shareCard = useCallback(
    async (element: HTMLElement, matchTitle: string, cardType: string = 'score') => {
      setIsSharing(true);
      setError(null);

      try {
        const blob = await generateImage(element);
        if (!blob) return;

        const filename = generateShareFilename(matchTitle, cardType);

        if (supportsNativeShare) {
          const shared = await shareImageFile(
            blob,
            filename,
            matchTitle,
            `Live cricket score from Inningz`
          );

          if (!shared) {
            downloadBlob(blob, filename);
          }
        } else {
          downloadBlob(blob, filename);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to share';
        setError(message);
        console.error('Share error:', err);
        // Fallback download
        try {
          const blob = await generateImage(element);
          if (blob) {
            const filename = generateShareFilename(matchTitle, cardType);
            downloadBlob(blob, filename);
          }
        } catch {
          // Silent fail
        }
      } finally {
        setIsSharing(false);
      }
    },
    [generateImage, supportsNativeShare]
  );

  return {
    isGenerating,
    isSharing,
    error,
    generateImage,
    downloadCard,
    shareCard,
    supportsNativeShare,
  };
}
