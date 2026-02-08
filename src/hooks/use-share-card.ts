'use client';

import { useCallback, useState } from 'react';
import { toPng } from 'html-to-image';
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

        // Small delay to ensure everything is rendered
        await new Promise(resolve => setTimeout(resolve, 50));

        // Use html-to-image for more accurate rendering
        const dataUrl = await toPng(element, {
          width: 1080,
          height: 1080,
          pixelRatio: 1,
          backgroundColor: '#09090b',
          style: {
            transform: 'none',
            position: 'relative',
            left: '0',
            top: '0',
          },
          // Skip elements that might cause issues
          filter: (node) => {
            // Skip script tags and hidden elements
            if (node instanceof HTMLElement) {
              const tagName = node.tagName?.toLowerCase();
              if (tagName === 'script' || tagName === 'noscript') {
                return false;
              }
            }
            return true;
          },
        });

        // Convert data URL to blob
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        return blob;
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
