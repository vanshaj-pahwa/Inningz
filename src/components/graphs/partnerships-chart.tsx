'use client';

import type { PartnershipInnings } from '@/app/actions';
import Image from 'next/image';
import { UPSTREAM_STATIC_URL } from '@/lib/upstream';

interface PartnershipsChartProps {
  data: PartnershipInnings;
}

function PlayerAvatar({ imageId, name }: { imageId: number; name: string }) {
  const url = imageId && imageId !== 182026
    ? `${UPSTREAM_STATIC_URL}/a/img/v1/i1/c${imageId}/player.jpg?p=gthumb`
    : null;
  return (
    <div className="w-10 h-10 rounded-full bg-muted/60 overflow-hidden shrink-0 border border-border/50">
      {url ? (
        <Image src={url} alt={name} width={48} height={48} className="w-full h-full object-cover" unoptimized />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-muted-foreground/40">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
        </div>
      )}
    </div>
  );
}

export default function PartnershipsChart({ data }: PartnershipsChartProps) {
  if (!data.partnerships.length) {
    return <p className="text-xs text-muted-foreground">No partnership data available</p>;
  }

  const maxRuns = Math.max(...data.partnerships.map(p => p.totalRuns), 1);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b border-border/40">
        <span className="text-base font-display font-bold text-foreground">{data.teamShortName || data.teamName}</span>
        <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Partnerships</span>
      </div>

      <div className="space-y-6">
        {data.partnerships.map((p, i) => {
          const bat1Width = (p.bat1Runs / maxRuns) * 50;
          const bat2Width = (p.bat2Runs / maxRuns) * 50;
          return (
            <div key={i} className="flex items-center gap-3">
              <PlayerAvatar imageId={p.bat1ImageId} name={p.bat1Name} />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{p.bat1Name}</p>
                    <p className="text-[11px] text-muted-foreground tabular-nums">{p.bat1Runs} ({p.bat1Balls})</p>
                  </div>
                  <div className="text-center shrink-0 px-1">
                    <span className="text-sm font-semibold text-foreground tabular-nums">{p.totalRuns} ({p.totalBalls})</span>
                  </div>
                  <div className="min-w-0 text-right">
                    <p className="text-xs font-semibold text-foreground truncate">{p.bat2Name}</p>
                    <p className="text-[11px] text-muted-foreground tabular-nums">{p.bat2Runs} ({p.bat2Balls})</p>
                  </div>
                </div>
                <div className="relative h-2 w-full">
                  <div
                    className="absolute top-0 h-full rounded-l-sm"
                    style={{ right: 'calc(50% + 1.5px)', width: `${bat1Width}%`, backgroundColor: '#E6A937' }}
                  />
                  <div
                    className="absolute top-0 h-full rounded-r-sm opacity-60"
                    style={{ left: 'calc(50% + 1.5px)', width: `${bat2Width}%`, backgroundColor: '#E6A937' }}
                  />
                </div>
              </div>
              <PlayerAvatar imageId={p.bat2ImageId} name={p.bat2Name} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
