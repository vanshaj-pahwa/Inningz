'use client';

import { useRef, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Share2, Loader2, Check } from 'lucide-react';
import { useShareCard } from '@/hooks/use-share-card';
import StatShareCard, { type StatShareCardProps } from './stat-share-card';

interface StatShareDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    matchTitle: string;
    cardData: StatShareCardProps;
}

export default function StatShareDialog({
    open,
    onOpenChange,
    matchTitle,
    cardData,
}: StatShareDialogProps) {
    const captureRef = useRef<HTMLDivElement>(null);
    const previewRef = useRef<HTMLDivElement>(null);
    const { downloadCard, shareCard, isGenerating, isSharing, supportsNativeShare } =
        useShareCard();
    const [downloadSuccess, setDownloadSuccess] = useState(false);
    const [previewHeight, setPreviewHeight] = useState(300);

    const previewWidth = 300;
    const scaleFactor = previewWidth / 1080;

    // Measure the actual card height after render
    useEffect(() => {
        if (open && previewRef.current) {
            const timer = setTimeout(() => {
                if (previewRef.current) {
                    const actualHeight = previewRef.current.offsetHeight;
                    setPreviewHeight(Math.round(actualHeight * scaleFactor));
                }
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [open, cardData, scaleFactor]);

    const handleDownload = async () => {
        if (!captureRef.current) return;
        setDownloadSuccess(false);
        await downloadCard(captureRef.current, matchTitle, 'stat');
        setDownloadSuccess(true);
        setTimeout(() => setDownloadSuccess(false), 2000);
    };

    const handleShare = async () => {
        if (!captureRef.current) return;
        await shareCard(captureRef.current, matchTitle, 'stat');
    };

    const isLoading = isGenerating || isSharing;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[360px] sm:max-w-[380px] p-0 gap-0 overflow-hidden bg-card border-border">
                <DialogHeader className="px-4 pt-4 pb-3">
                    <DialogTitle className="text-base font-display">Share Stat</DialogTitle>
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
                    <StatShareCard ref={captureRef} {...cardData} />
                </div>

                {/* Card Preview */}
                <div className="px-4 pb-4">
                    <div
                        className="relative rounded-lg overflow-hidden border border-zinc-800 shadow-2xl bg-zinc-950 mx-auto"
                        style={{ width: previewWidth, height: previewHeight }}
                    >
                        <div
                            ref={previewRef}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                transformOrigin: 'top left',
                                transform: `scale(${scaleFactor})`,
                            }}
                        >
                            <StatShareCard {...cardData} />
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
