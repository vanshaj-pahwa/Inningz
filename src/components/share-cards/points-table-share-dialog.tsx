'use client';

import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Share2, Loader2, Check } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useShareCard } from '@/hooks/use-share-card';
import PointsTableShareCard, { teamFlagProxyUrl, type PointsTableShareCardProps } from './points-table-share-card';

interface PointsTableShareDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    cardData: PointsTableShareCardProps;
}

async function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
    });
}

export default function PointsTableShareDialog({ open, onOpenChange, cardData }: PointsTableShareDialogProps) {
    const captureRef = useRef<HTMLDivElement>(null);
    const previewRef = useRef<HTMLDivElement>(null);
    const { downloadCard, shareCard, isGenerating, isSharing, supportsNativeShare } = useShareCard();
    const { resolvedTheme } = useTheme();
    const mode = resolvedTheme === 'light' ? 'light' : 'dark';
    const [downloadSuccess, setDownloadSuccess] = useState(false);
    const [previewHeight, setPreviewHeight] = useState(300);
    const [flagDataUrls, setFlagDataUrls] = useState<Record<number, string>>({});
    const [flagsLoading, setFlagsLoading] = useState(false);

    const previewWidth = 320;
    const scaleFactor = previewWidth / 1080;
    const shareTitle = `${cardData.seriesName} — Points Table`;

    // Preload team flags as data URLs so html-to-image embeds them reliably in the captured PNG
    useEffect(() => {
        if (!open) return;
        let cancelled = false;
        setFlagsLoading(true);

        const teams = cardData.groups.flatMap(g => g.teams).filter(t => t.teamImageId);
        const seen = new Set<number>();
        const unique = teams.filter(t => {
            if (seen.has(t.teamId)) return false;
            seen.add(t.teamId);
            return true;
        });

        Promise.all(
            unique.map(async (t) => {
                try {
                    const res = await fetch(teamFlagProxyUrl(t.teamImageId!, t.teamName));
                    if (!res.ok) return null;
                    const blob = await res.blob();
                    const dataUrl = await blobToDataUrl(blob);
                    return [t.teamId, dataUrl] as const;
                } catch {
                    return null;
                }
            })
        ).then(entries => {
            if (cancelled) return;
            const map: Record<number, string> = {};
            for (const e of entries) if (e) map[e[0]] = e[1];
            setFlagDataUrls(map);
            setFlagsLoading(false);
        });

        return () => { cancelled = true; };
    }, [open, cardData.groups]);

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
    }, [open, cardData, scaleFactor, flagDataUrls]);

    const handleDownload = async () => {
        if (!captureRef.current) return;
        setDownloadSuccess(false);
        await downloadCard(captureRef.current, shareTitle, 'points-table');
        setDownloadSuccess(true);
        setTimeout(() => setDownloadSuccess(false), 2000);
    };

    const handleShare = async () => {
        if (!captureRef.current) return;
        await shareCard(captureRef.current, shareTitle, 'points-table');
    };

    const isLoading = isGenerating || isSharing;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[380px] sm:max-w-[400px] p-0 gap-0 overflow-hidden bg-card border-border">
                <DialogHeader className="px-4 pt-4 pb-3">
                    <DialogTitle className="text-base font-display">Share Points Table</DialogTitle>
                </DialogHeader>

                {/* Hidden full-size card for capture */}
                <div
                    style={{ position: 'fixed', left: '-9999px', top: '0', zIndex: -1, pointerEvents: 'none' }}
                    aria-hidden="true"
                >
                    <PointsTableShareCard ref={captureRef} {...cardData} flagDataUrls={flagDataUrls} mode={mode} />
                </div>

                {/* Preview */}
                <div className="px-4 pb-4">
                    <div
                        className="relative rounded-lg overflow-hidden border border-border shadow-2xl bg-muted/40 mx-auto"
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
                            <PointsTableShareCard {...cardData} flagDataUrls={flagDataUrls} mode={mode} />
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="px-4 py-3 bg-muted/50 border-t border-border flex items-center justify-end gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownload}
                        disabled={isLoading || flagsLoading}
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
                        disabled={isLoading || flagsLoading}
                        className="gap-2"
                    >
                        {isSharing || flagsLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Share2 className="w-4 h-4" />
                        )}
                        {flagsLoading ? 'Loading...' : supportsNativeShare ? 'Share' : 'Save'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
