'use client';

import { useState } from 'react';
import { Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import ShareCardDialog from './share-card-dialog';
import type { QuickScoreCardProps } from './quick-score-card';

interface ShareButtonProps {
  matchTitle: string;
  cardData: QuickScoreCardProps;
  variant?: 'default' | 'icon' | 'mini';
  className?: string;
}

export default function ShareButton({
  matchTitle,
  cardData,
  variant = 'icon',
  className,
}: ShareButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  if (variant === 'mini') {
    return (
      <>
        <button
          onClick={() => setDialogOpen(true)}
          className={cn(
            'p-1.5 rounded-lg hover:bg-zinc-800 transition-colors',
            className
          )}
          aria-label="Share score"
          title="Share score"
        >
          <Share2 className="w-4 h-4 text-zinc-400" />
        </button>
        <ShareCardDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          matchTitle={matchTitle}
          cardData={cardData}
        />
      </>
    );
  }

  if (variant === 'icon') {
    return (
      <>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setDialogOpen(true)}
          className={cn(
            'h-9 w-9 rounded-xl bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700/50',
            className
          )}
          aria-label="Share score"
          title="Share score"
        >
          <Share2 className="w-4 h-4" />
        </Button>
        <ShareCardDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          matchTitle={matchTitle}
          cardData={cardData}
        />
      </>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setDialogOpen(true)}
        className={cn('gap-2', className)}
      >
        <Share2 className="w-4 h-4" />
        Share
      </Button>
      <ShareCardDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        matchTitle={matchTitle}
        cardData={cardData}
      />
    </>
  );
}
