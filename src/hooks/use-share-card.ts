'use client';

import { useCallback, useState } from 'react';
import { toPng } from 'html-to-image';
import {
  canShareFiles,
  shareImageFile,
  downloadBlob,
  generateShareFilename,
} from '@/lib/share-utils';

type ActiveAction = 'download' | 'share' | null;

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
  const [activeAction, setActiveAction] = useState<ActiveAction>(null);
  const [error, setError] = useState<string | null>(null);

  const supportsNativeShare = canShareFiles();

  // Derived states for backward compatibility
  const isGenerating = activeAction === 'download';
  const isSharing = activeAction === 'share';

  const generateImageInternal = useCallback(
    async (element: HTMLElement): Promise<Blob | null> => {
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
      }
    },
    []
  );

  const generateImage = useCallback(
    async (element: HTMLElement): Promise<Blob | null> => {
      setActiveAction('download');
      try {
        return await generateImageInternal(element);
      } finally {
        setActiveAction(null);
      }
    },
    [generateImageInternal]
  );

  const downloadCard = useCallback(
    async (element: HTMLElement, matchTitle: string, cardType: string = 'score') => {
      setActiveAction('download');
      try {
        const blob = await generateImageInternal(element);
        if (!blob) return;

        const filename = generateShareFilename(matchTitle, cardType);
        downloadBlob(blob, filename);
      } finally {
        setActiveAction(null);
      }
    },
    [generateImageInternal]
  );

  const shareCard = useCallback(
    async (element: HTMLElement, matchTitle: string, cardType: string = 'score') => {
      setActiveAction('share');
      setError(null);

      try {
        const blob = await generateImageInternal(element);
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
          const blob = await generateImageInternal(element);
          if (blob) {
            const filename = generateShareFilename(matchTitle, cardType);
            downloadBlob(blob, filename);
          }
        } catch {
          // Silent fail
        }
      } finally {
        setActiveAction(null);
      }
    },
    [generateImageInternal, supportsNativeShare]
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
