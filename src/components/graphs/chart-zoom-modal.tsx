'use client';

import { useState, ReactNode } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ZoomIn } from 'lucide-react';

interface ChartZoomModalProps {
    title?: string;
    inlineHeight?: number;
    modalHeight?: number;
    renderChart: (height: number) => ReactNode;
    className?: string;
    /** Skip the default muted background + padding (for non-recharts custom charts). */
    bare?: boolean;
}

export default function ChartZoomModal({
    title,
    inlineHeight = 280,
    modalHeight = 560,
    renderChart,
    className,
    bare,
}: ChartZoomModalProps) {
    const [open, setOpen] = useState(false);
    const containerClass = bare
        ? `relative ${className ?? ''}`
        : `relative rounded-xl bg-muted/20 p-2 pt-4 ${className ?? ''}`;

    return (
        <div className={containerClass}>
            <button
                type="button"
                onClick={() => setOpen(true)}
                aria-label="Zoom chart"
                title="Zoom chart"
                data-hide-in-share
                className="absolute top-2 right-2 z-10 p-1.5 rounded-md bg-card/80 backdrop-blur border border-border/60 text-muted-foreground hover:text-foreground hover:bg-card hover:border-primary/40 transition-colors shadow-sm"
            >
                <ZoomIn className="w-3.5 h-3.5" />
            </button>

            {renderChart(inlineHeight)}

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-6xl w-[95vw] p-4 md:p-6 max-h-[95vh] overflow-y-auto">
                    {title && (
                        <DialogHeader>
                            <DialogTitle className="text-base md:text-lg font-display tracking-tight">
                                {title}
                            </DialogTitle>
                        </DialogHeader>
                    )}
                    <div className={bare ? 'mt-2' : 'rounded-xl bg-muted/20 p-2 pt-4 mt-2'}>
                        {renderChart(modalHeight)}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
