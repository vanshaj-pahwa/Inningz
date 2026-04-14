'use client';

import { ReactNode, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Share2, Loader2, Check } from 'lucide-react';
import { useShareCard } from '@/hooks/use-share-card';
import GraphShareCard from './graph-share-card';

interface GraphShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matchTitle: string;
  seriesName?: string;
  sectionLabel: string;
  sectionSubtitle?: string;
  inningsLabel?: string;
  chart: ReactNode;
}

export default function GraphShareDialog({
  open,
  onOpenChange,
  matchTitle,
  seriesName,
  sectionLabel,
  sectionSubtitle,
  inningsLabel,
  chart,
}: GraphShareDialogProps) {
  const captureRef = useRef<HTMLDivElement>(null);
  const { downloadCard, shareCard, isGenerating, isSharing, supportsNativeShare } = useShareCard();
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const cardType = `graph-${sectionLabel.toLowerCase().replace(/\s+/g, '-')}`;

  const handleDownload = async () => {
    if (!captureRef.current) return;
    setDownloadSuccess(false);
    await downloadCard(captureRef.current, matchTitle, cardType);
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 2000);
  };

  const handleShare = async () => {
    if (!captureRef.current) return;
    await shareCard(captureRef.current, matchTitle, cardType);
  };

  const isLoading = isGenerating || isSharing;
  const scaleFactor = 300 / 1080;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[360px] sm:max-w-[380px] p-0 gap-0 overflow-hidden bg-card border-border">
        <DialogHeader className="px-4 pt-4 pb-3">
          <DialogTitle className="text-base font-display">Share {sectionLabel}</DialogTitle>
        </DialogHeader>

        {/* Hidden full-size card for capture */}
        <div
          style={{
            position: 'fixed',
            left: '-9999px',
            top: '0',
            zIndex: -1,
            pointerEvents: 'none',
          }}
          aria-hidden="true"
        >
          <GraphShareCard
            ref={captureRef}
            title={sectionLabel}
            matchTitle={matchTitle}
            seriesName={seriesName}
            sectionLabel={sectionLabel}
            sectionSubtitle={sectionSubtitle}
            inningsLabel={inningsLabel}
          >
            {chart}
          </GraphShareCard>
        </div>

        {/* Scaled preview — zoom affects layout so container auto-fits */}
        <div className="px-4 pb-4">
          <div
            className="relative rounded-lg overflow-hidden border border-zinc-800 shadow-2xl bg-zinc-950 mx-auto"
            style={{ width: 300, height: 'fit-content' }}
          >
            <div style={{ zoom: scaleFactor }}>
              <GraphShareCard
                title={sectionLabel}
                matchTitle={matchTitle}
                seriesName={seriesName}
                sectionLabel={sectionLabel}
                sectionSubtitle={sectionSubtitle}
                inningsLabel={inningsLabel}
              >
                {chart}
              </GraphShareCard>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-4 py-3 bg-muted/50 border-t border-border flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={isLoading}
            className="gap-2"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : downloadSuccess ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {downloadSuccess ? 'Saved!' : 'Download'}
          </Button>
          <Button
            size="sm"
            onClick={handleShare}
            disabled={isLoading}
            className="gap-2 bg-cyan-500 hover:bg-cyan-600 text-black"
          >
            {isSharing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Share2 className="w-4 h-4" />
            )}
            {supportsNativeShare ? 'Share' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
