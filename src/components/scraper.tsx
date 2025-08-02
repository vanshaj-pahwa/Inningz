
'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { getScoreForMatchId } from '@/app/actions';
import type { ScrapeCricbuzzUrlOutput, Commentary } from '@/app/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LoaderCircle, User, ArrowLeft } from "lucide-react";
import { Button } from './ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';
import FullScorecard from './full-scorecard';

export interface ScrapeState {
  success: boolean;
  data?: ScrapeCricbuzzUrlOutput | null;
  error?: string | null;
  matchId?: string | null;
}

type LastEventType = {
  text: string;
  key: number;
  variant: 'default' | 'destructive' | 'four' | 'six';
};

type View = 'live' | 'scorecard';

const CricketBatIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" version="1.1" xmlnsXlink="http://www.w3.org/1999/xlink" width="16" height="16" x="0" y="0" viewBox="0 0 512 512" className="inline-block ml-1 text-primary" xmlSpace="preserve"><g fill="currentColor"><path d="m148.67 150.612-22.453 43.502a7.834 7.834 0 0 0 1.534 8.906l96.127 90.728-1.671 12.502 203.456 203.456a7.834 7.834 0 0 0 8.906 1.534l7.782-3.704a137.76 137.76 0 0 0 65.183-65.183l3.704-7.782a7.834 7.834 0 0 0-1.534-8.906L306.248 222.208l-12.104 1.671-91.196-96.057a7.834 7.834 0 0 0-8.906-1.534z" opacity="1"></path><path d="m511.237 434.57-3.698 7.777a130.779 130.779 0 0 1-3.295 6.466L315.536 260.11 186.165 127.612c-.857-.843-.663-2.264.422-2.78l9.477-.85c2.995-1.425 8.717 5.03 11.062 7.375l79.161 84.945 19.962 5.906 203.459 203.459a7.827 7.827 0 0 1 1.529 8.903z" opacity="1"></path><path d="m204.592 120.557 101.654 101.654 22.921 93.554c1.98 8.082-5.32 15.382-13.402 13.402l-93.554-22.921-101.655-101.653a7.846 7.846 0 0 1-1.54-8.901l24.725-51.949 51.949-24.725a7.846 7.846 0 0 1 8.902 1.539z" opacity="1"></path><path d="M315.533 260.112 183.092 127.67a8.515 8.515 0 0 0-2.21-1.601v-.011l14.811-7.044a7.865 7.865 0 0 1 8.903 1.539l101.653 101.653z" opacity="1"></path><path d="M223.643 223.644c-8.504 8.504-22.291 8.504-30.795 0L3 33.795c-3.998-3.998-3.998-10.481 0-14.48L19.315 3.001c3.998-3.998 10.481-3.998 14.48 0L223.644 192.85c8.503 8.503 8.503 22.29-.001 30.794z" opacity="1"></path><path d="M223.641 223.642a21.705 21.705 0 0 1-8.965 5.412c2.324-7.467.516-15.937-5.391-21.845L19.437 17.362c-3.997-4.008-10.483-4.008-14.481 0L19.313 3.006a10.222 10.222 0 0 1 14.48 0L223.64 192.853c8.512 8.5 8.512 22.289.001 30.789z" opacity="1"></path></g></svg>
)

const CricketBallIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" version="1.1" xmlnsXlink="http://www.w3.org/1999/xlink" width="14" height="14" x="0" y="0" viewBox="0 0 173.397 173.397" className="inline-block ml-1 text-primary" xmlSpace="preserve" fillRule="evenodd"><g fill="currentColor"><path d="M154.034 128.243a79.182 79.182 0 0 1-10.213 13.183L31.97 29.576a79.182 79.182 0 0 1 13.183-10.213 3.498 3.498 0 0 1 4.353.507l104.02 104.019a3.498 3.498 0 0 1 .507 4.354zm-27.008 11.207a1.693 1.693 0 0 0-2.395 2.394l2.98 2.98a1.693 1.693 0 0 0 2.394-2.395zm-8.005-8.005a1.693 1.693 0 0 0-2.395 2.394l2.98 2.98a1.693 1.693 0 0 0 2.394-2.395zm-8.005-8.005a1.693 1.693 0 0 0-2.394 2.395l2.979 2.979a1.693 1.693 0 0 0 2.395-2.395zm-8.005-8.005a1.693 1.693 0 0 0-2.394 2.395l2.98 2.98a1.693 1.693 0 0 0 2.394-2.395zm-8.005-8.005a1.693 1.693 0 0 0-2.394 2.395l2.98 2.98a1.693 1.693 0 0 0 2.394-2.395zm-8.004-8.005a1.693 1.693 0 0 0-2.395 2.395l2.98 2.98a1.693 1.693 0 0 0 2.394-2.395zm-8.005-8.004a1.693 1.693 0 0 0-2.395 2.394l2.98 2.98a1.693 1.693 0 0 0 2.394-2.395zm-8.005-8.005a1.693 1.693 0 0 0-2.395 2.394l2.98 2.98a1.693 1.693 0 0 0 2.394-2.395zm-8.005-8.005a1.693 1.693 0 0 0-2.394 2.394l2.979 2.98a1.693 1.693 0 0 0 2.395-2.395zm-8.005-8.005a1.693 1.693 0 0 0-2.394 2.395l2.98 2.98a1.693 1.693 0 0 0 2.394-2.396zm-8.004-8.005a1.693 1.693 0 0 0-2.395 2.395l2.98 2.98a1.693 1.693 0 0 0 2.394-2.395zm-8.005-8.005a1.693 1.693 0 0 0-2.395 2.395l2.98 2.98a1.693 1.693 0 0 0 2.394-2.395zm-8.005-8.004a1.693 1.693 0 0 0-2.395 2.394l2.98 2.98a1.693 1.693 0 0 0 2.394-2.395zm110.876 81.239a1.693 1.693 0 0 0-2.395 2.395l2.98 2.979a1.693 1.693 0 0 0 2.394-2.395zm-8.005-8.005a1.693 1.693 0 0 0-2.395 2.395l2.98 2.98a1.693 1.693 0 0 0 2.394-2.395zm-8.005-8.005a1.693 1.693 0 0 0-2.394 2.395l2.979 2.98a1.693 1.693 0 0 0 2.395-2.395zm-8.005-8.004a1.693 1.693 0 0 0-2.394 2.394l2.98 2.98a1.693 1.693 0 0 0 2.394-2.395zm-8.004-8.005a1.693 1.693 0 0 0-2.395 2.394l2.98 2.98a1.693 1.693 0 0 0 2.394-2.395zm-8.005-8.005A1.693 1.693 0 0 0 99.425 87l2.98 2.98a1.693 1.693 0 0 0 2.394-2.395zm-8.005-8.005a1.693 1.693 0 0 0-2.395 2.395l2.98 2.98a1.693 1.693 0 0 0 2.394-2.396zm-8.005-8.005a1.693 1.693 0 0 0-2.395 2.395l2.98 2.98a1.693 1.693 0 0 0 2.394-2.395zm-8.005-8.005a1.693 1.693 0 0 0-2.394 2.395l2.98 2.98a1.693 1.693 0 0 0 2.394-2.395zM69.8 52.588a1.693 1.693 0 0 0-2.394 2.394l2.98 2.98a1.693 1.693 0 0 0 2.394-2.395zm-8.004-8.005a1.693 1.693 0 0 0-2.395 2.394l2.98 2.98a1.693 1.693 0 0 0 2.394-2.395zm-8.005-8.005a1.693 1.693 0 0 0-2.395 2.395l2.98 2.979a1.693 1.693 0 0 0 2.394-2.395zm-8.005-8.005a1.693 1.693 0 0 0-2.395 2.395l2.98 2.98a1.693 1.693 0 0 0 2.394-2.396zm95.64 115.248a79.19 79.19 0 0 1-13.183 10.213 3.498 3.498 0 0 1-4.354-.507L19.87 49.508a3.498 3.498 0 0 1-.507-4.354 79.19 79.19 0 0 1 10.213-13.182l111.85 111.85zM18.415 52.841C4.28 81.34 9.078 116.842 32.817 140.581c23.738 23.738 59.24 28.536 87.74 14.402L18.414 52.842zm79.277 98.539a1.69 1.69 0 0 0-.556-3.334c-4.122.697-8.292.98-12.443.847a62.506 62.506 0 0 1-12.355-1.642 1.691 1.691 0 0 0-.767 3.294 65.844 65.844 0 0 0 13.016 1.721c4.39.14 8.781-.155 13.105-.886zm-41.237-6.442a1.692 1.692 0 0 0 1.56-3.003 61.847 61.847 0 0 1-15.314-11.24 1.693 1.693 0 0 0-2.394 2.395c2.4 2.401 4.957 4.586 7.64 6.555a65.209 65.209 0 0 0 8.508 5.293zm60.487-116.48a1.692 1.692 0 0 0-1.56 3.004A61.847 61.847 0 0 1 130.695 42.7a1.693 1.693 0 0 0 2.394-2.395 66.122 66.122 0 0 0-7.639-6.554 65.209 65.209 0 0 0-8.509-5.293zm-41.237-6.441a1.69 1.69 0 0 0 .556 3.334 62.617 62.617 0 0 1 12.443-.847c4.138.132 8.278.68 12.355 1.642a1.691 1.691 0 0 0 .767-3.294A65.844 65.844 0 0 0 88.81 21.13c-4.39-.14-8.781.155-13.105.887zm79.277 98.539c14.135-28.499 9.337-64.001-14.401-87.74C116.842 9.078 81.34 4.28 52.84 18.414l102.141 102.141z" opacity="1"></path></g></svg>
);


export default function ScoreDisplay({ matchId }: { matchId: string }) {
  const [scoreState, setScoreState] = useState<ScrapeState>({ success: false });
  const [lastEvent, setLastEvent] = useState<LastEventType | null>(null);
  const previousData = useRef<ScrapeCricbuzzUrlOutput | null>(null);
  const [view, setView] = useState<View>('live');


  const fetchScore = async () => {
    if (!matchId) return;
    const newState = await getScoreForMatchId(matchId);
    setScoreState(newState);
  };

  useEffect(() => {
    fetchScore();
    const interval = setInterval(fetchScore, 10000);
    return () => clearInterval(interval);
  }, [matchId]);
  
  const parseScore = (score: string): { runs: number, wickets: number } | null => {
    if (!score || !score.includes('/')) return null;
    const parts = score.split(' ')[1]?.split('/');
    if (!parts || parts.length < 2) return null;
    const runs = parseInt(parts[0], 10);
    const wickets = parseInt(parts[1], 10);
    if (isNaN(runs) || isNaN(wickets)) return null;
    return { runs, wickets };
  }
  
  const parseOvers = (score: string): number | null => {
      if (!score || !score.includes('(')) return null;
      const oversMatch = score.match(/\(([^)]+)\)/);
      if (!oversMatch || !oversMatch[1]) return null;
      const overs = parseFloat(oversMatch[1]);
      if (isNaN(overs)) return null;
      return overs;
  }

  useEffect(() => {
    if (scoreState.data && previousData.current) {
        const currentScore = parseScore(scoreState.data.score);
        const prevScore = parseScore(previousData.current.score);
        const currentOvers = parseOvers(scoreState.data.score);
        const prevOvers = parseOvers(previousData.current.score);

        const isLive = !scoreState.data.status.toLowerCase().includes('complete') && !scoreState.data.status.toLowerCase().includes('won');

        let eventToShow: Omit<LastEventType, 'key'> | null = null;

        if (currentScore && prevScore && isLive) {
            const runDiff = currentScore.runs - prevScore.runs;
            const wicketDiff = currentScore.wickets - prevScore.wickets;
            const oversChanged = currentOvers !== null && prevOvers !== null && currentOvers > prevOvers;

            if (wicketDiff > 0) {
                eventToShow = { text: 'W', variant: 'destructive' };
            } else if (runDiff === 6) {
                eventToShow = { text: '6', variant: 'six' };
            } else if (runDiff === 4) {
                eventToShow = { text: '4', variant: 'four' };
            } else if (runDiff > 0 && runDiff < 4) {
                eventToShow = { text: `+${runDiff}`, variant: 'default' };
            } else if (runDiff === 0 && wicketDiff === 0 && oversChanged) {
                 eventToShow = { text: 'DOT', variant: 'default' };
            }
        }
        
        if (eventToShow) {
            setLastEvent({ ...eventToShow, key: Date.now() });
        }
    }

    if (scoreState.data) {
        previousData.current = scoreState.data;
    }
}, [scoreState.data]);


  if (scoreState.error) {
    return (
      <div className="max-w-4xl mx-auto">
        <Alert variant="destructive" className="mt-8">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{scoreState.error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  const { data } = scoreState;

  if (!data && !scoreState.error) {
    return (
      <div className="w-full flex items-center justify-center p-8 mt-16">
         <LoaderCircle className="w-8 h-8 animate-spin text-primary" />
         <p className="ml-4 text-muted-foreground">Fetching live score...</p>
     </div>
    )
  }
    
  const renderCommentaryItem = (comment: Commentary, index: number) => {
    const baseClasses = "p-3 flex gap-3 items-start text-sm";
    
    if (comment.type === 'user' && comment.author) {
      return (
        <div key={index} className={`${baseClasses} border-t`}>
            <User size={16} className="text-muted-foreground mt-0.5 flex-shrink-0" />
            <div>
                <p className="font-semibold text-primary">{comment.author}</p>
                <p className="text-foreground/80 italic" dangerouslySetInnerHTML={{ __html: `"${comment.text}"` }}/>
            </div>
        </div>
      );
    }

    if (comment.type === 'stat') {
      const isShortText = comment.text.length < 100;
      return (
        <div key={index} className={`${baseClasses} bg-slate-50 dark:bg-gray-800/20 border-t`}>
          <p className={`text-muted-foreground w-full ${isShortText ? 'text-center' : ''}`} dangerouslySetInnerHTML={{ __html: comment.text }} />
        </div>
      )
    }
    
    const over = comment.text.split(':')[0];
    const text = comment.text.substring(comment.text.indexOf(':') + 1);
    const events = comment.event?.split(',') || [];

    const getEventDisplay = (event: string) => {
        switch(event) {
            case 'FOUR': return { text: '4', className: 'bg-blue-500 text-white' };
            case 'SIX': return { text: '6', className: 'bg-purple-600 text-white' };
            case 'WICKET': return { text: 'W', className: 'bg-red-600 text-white' };
            case 'FIFTY': return { text: '50', className: 'bg-green-500 text-white text-xs px-1.5'};
            case 'HUNDRED': return { text: '100', className: 'bg-amber-500 text-white text-xs px-1.5'};
            default: return null;
        }
    }

    return (
      <div key={index} className={`${baseClasses} border-t`}>
          <div className="flex flex-col items-center flex-shrink-0 w-12 space-y-1">
             <div className="font-mono text-xs text-muted-foreground">{over}</div>
              <div className="flex flex-col items-center space-y-1">
                {events.map((event, i) => {
                    const eventDisplay = getEventDisplay(event);
                    if (!eventDisplay) return null;
                    
                    const isRound = ['FOUR', 'SIX', 'WICKET'].includes(event);
                    
                    return (
                        <div key={i} className={cn(`flex-shrink-0 flex items-center justify-center font-bold text-sm`,
                           isRound ? 'w-6 h-6 rounded-full' : 'rounded',
                           eventDisplay.className
                        )}>
                            {eventDisplay.text}
                        </div>
                    )
                })}
              </div>
          </div>
          <p className="text-foreground flex-1" dangerouslySetInnerHTML={{ __html: text }} />
      </div>
    );
  };

  const getEventBadgeVariant = (variant: LastEventType['variant']) => {
    switch (variant) {
      case 'destructive': return 'destructive';
      case 'four': return 'default';
      case 'six': return 'secondary'; // Or create a custom variant
      default: return 'default';
    }
  }
  
  const getEventBadgeClass = (variant: LastEventType['variant']) => {
    switch(variant) {
        case 'four': return 'bg-blue-600 hover:bg-blue-700 text-white';
        case 'six': return 'bg-purple-600 hover:bg-purple-700 text-white';
        default: return '';
    }
  }


  return (
    <div className="w-full">
        <div className="flex items-center gap-2 mb-4">
          <Button asChild variant="outline" size="icon">
              <Link href="/">
                  <ArrowLeft className="h-4 w-4"/>
              </Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold">{data?.title}</h1>
            <p className="text-sm text-muted-foreground">{data?.toss}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 mb-4">
            <Button 
                variant={view === 'live' ? 'default' : 'outline'}
                onClick={() => setView('live')}
            >
                Live
            </Button>
            <Button 
                variant={view === 'scorecard' ? 'default' : 'outline'}
                onClick={() => setView('scorecard')}
            >
                Scorecard
            </Button>
        </div>

        <div>
            {view === 'live' && (
                <div className="space-y-6">
                    <Card>
                        <CardContent className="p-4 relative">
                           {lastEvent && (
                              <Badge
                                key={lastEvent.key}
                                variant={getEventBadgeVariant(lastEvent.variant)}
                                className={`absolute top-[-0.5rem] right-2 text-lg font-bold event-animation tabular-nums ${getEventBadgeClass(lastEvent.variant)}`}
                              >
                               {lastEvent.text}
                              </Badge>
                            )}
                            <div className="space-y-2">
                                {data?.previousInnings.map((inning, index) => (
                                    <div key={index} className="text-lg text-muted-foreground flex justify-between">
                                        <span>{inning.teamName}</span>
                                        <span className="font-bold">{inning.score}</span>
                                    </div>
                                ))}
                                <div className="text-2xl font-bold flex justify-between items-baseline">
                                    <span>{data?.score}</span>
                                    <span className="text-base font-normal text-muted-foreground">CRR: {data?.currentRunRate}</span>
                                </div>
                            </div>
                            <p className="text-base text-destructive font-semibold mt-2">{data?.status}</p>
                        </CardContent>
                    </Card>
    
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                        <div className="lg:col-span-3 space-y-6">
                           <Card>
                                <CardHeader>
                                    <CardTitle>Live Commentary</CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="space-y-2 max-h-[80rem] overflow-y-auto hide-scrollbar">
                                        {data?.commentary.map((comment, index) => renderCommentaryItem(comment, index))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                        
                        <div className="lg:col-span-2 space-y-6">
                            <Card>
                                <CardHeader><CardTitle>Scorecard</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div>
                                            <h4 className="font-semibold mb-2">Batting</h4>
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className="w-[200px]">Batter</TableHead>
                                                        <TableHead className="text-right">R</TableHead>
                                                        <TableHead className="text-right">B</TableHead>
                                                        <TableHead className="text-right">4s</TableHead>
                                                        <TableHead className="text-right">6s</TableHead>
                                                        <TableHead className="text-right">SR</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {data?.batsmen.map((batsman, index) => (
                                                        <TableRow key={index} className={cn("even:bg-slate-50 dark:even:bg-gray-800/20", {
                                                            'bg-accent/20': batsman.onStrike
                                                        })}>
                                                            <TableCell className="font-medium flex items-center">{batsman.name}{batsman.onStrike ? <CricketBatIcon /> : ''}</TableCell>
                                                            <TableCell className="text-right font-bold">{batsman.runs}</TableCell>
                                                            <TableCell className="text-right">{batsman.balls}</TableCell>
                                                            <TableCell className="text-right">{batsman.fours}</TableCell>
                                                            <TableCell className="text-right">{batsman.sixes}</TableCell>
                                                            <TableCell className="text-right">{batsman.strikeRate}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
    
                                        <div>
                                            <h4 className="font-semibold mb-2">Bowling</h4>
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className="w-[200px]">Bowler</TableHead>
                                                        <TableHead className="text-right">O</TableHead>
                                                        <TableHead className="text-right">M</TableHead>
                                                        <TableHead className="text-right">R</TableHead>
                                                        <TableHead className="text-right">W</TableHead>
                                                        <TableHead className="text-right">ECO</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {data?.bowlers.map((bowler, index) => (
                                                        <TableRow key={index} className={cn("even:bg-slate-50 dark:even:bg-gray-800/20", {
                                                            'bg-accent/20': bowler.onStrike
                                                        })}>
                                                            <TableCell className="font-medium flex items-center">{bowler.name}{bowler.onStrike ? <CricketBallIcon /> : ''}</TableCell>
                                                            <TableCell className="text-right">{bowler.overs}</TableCell>
                                                            <TableCell className="text-right">{bowler.maidens}</TableCell>
                                                            <TableCell className="text-right">{bowler.runs}</TableCell>
                                                            <TableCell className="text-right font-bold">{bowler.wickets}</TableCell>
                                                            <TableCell className="text-right">{bowler.economy}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader>
                                    <CardTitle>Match Info</CardTitle>
                                </CardHeader>
                                <CardContent className="text-sm space-y-4">
                                    <div>
                                        <p className="font-semibold">Partnership</p>
                                        <p className="text-muted-foreground">{data?.partnership}</p>
                                    </div>
                                    <div>
                                        <p className="font-semibold">Last Wicket</p>
                                        <p className="text-muted-foreground">{data?.lastWicket}</p>
                                    </div>
                                    <div>
                                        <p className="font-semibold">Recent Overs</p>
                                        <p className="text-muted-foreground">{data?.recentOvers}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            )}
            {view === 'scorecard' && (
                <FullScorecard matchId={matchId} />
            )}
        </div>
    </div>
  );
}
