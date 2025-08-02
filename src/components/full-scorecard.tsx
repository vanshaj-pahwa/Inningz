
'use client';

import { useEffect, useState } from 'react';
import { getScorecardData, getPlayerProfile } from '@/app/actions';
import type { FullScorecard, PlayerProfile } from '@/app/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoaderCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import PlayerProfileDisplay from './player-profile';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Separator } from './ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';

export default function FullScorecardDisplay({ matchId }: { matchId: string }) {
  const [scorecard, setScorecard] = useState<FullScorecard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<PlayerProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    const fetchScorecard = async () => {
      setLoading(true);
      setError(null);
      const result = await getScorecardData(matchId);
      if (result.success && result.data) {
        setScorecard(result.data);
      } else {
        setError(result.error ?? 'Failed to fetch scorecard data.');
      }
      setLoading(false);
    };

    fetchScorecard();
    const interval = setInterval(fetchScorecard, 30000);
    return () => clearInterval(interval);
  }, [matchId]);

  useEffect(() => {
    const fetchProfile = async () => {
        if (!selectedProfileId) return;
        setProfileLoading(true);
        const result = await getPlayerProfile(selectedProfileId);
        if (result.success && result.data) {
            setSelectedProfile(result.data);
        }
        setProfileLoading(false);
    };
    fetchProfile();
  }, [selectedProfileId]);


  if (loading && !scorecard) {
    return (
      <div className="flex justify-center items-center p-8">
        <LoaderCircle className="w-8 h-8 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Loading scorecard...</p>
      </div>
    );
  }

  if (error) {
    return (
        <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
        </Alert>
    );
  }

  if (!scorecard) {
    return <p>No scorecard data available.</p>;
  }

  const handleProfileClick = (profileId: string | undefined) => {
    if (profileId) {
      setSelectedProfileId(profileId);
      setSelectedProfile(null);
    }
  }

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedProfileId(null);
      setSelectedProfile(null);
    }
  }

  const lastInningName = scorecard.innings.length > 0 ? scorecard.innings[scorecard.innings.length - 1].name : '';

  return (
    <div className="space-y-6">
        <h1 className="text-2xl font-bold">{scorecard.title}</h1>
        <p className="text-center font-bold text-lg text-destructive">{scorecard.status}</p>
      <Accordion type="single" collapsible defaultValue={lastInningName} className="w-full">
        {scorecard.innings.map((inning, index) => (
            <AccordionItem value={inning.name} key={index}>
                <AccordionTrigger>
                    <div className='text-left w-full'>
                        <h2 className="text-2xl font-bold">{inning.name}</h2>
                        <p className="text-xl text-primary font-semibold">{inning.score}</p>
                    </div>
                </AccordionTrigger>
                <AccordionContent>
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                            <div className="lg:col-span-3 space-y-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>{inning.battingTeamName} Batting</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <Table>
                                            <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-[200px]">Batter</TableHead>
                                                <TableHead>Dismissal</TableHead>
                                                <TableHead className="text-right">R</TableHead>
                                                <TableHead className="text-right">B</TableHead>
                                                <TableHead className="text-right">4s</TableHead>
                                                <TableHead className="text-right">6s</TableHead>
                                                <TableHead className="text-right">SR</TableHead>
                                            </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                            {inning.batsmen.map((batsman, i) => (
                                                <TableRow key={i} className="even:bg-slate-50 dark:even:bg-gray-800/20">
                                                <TableCell className="font-medium">
                                                    <span className={batsman.profileId ? "cursor-pointer hover:underline" : ""} onClick={() => handleProfileClick(batsman.profileId)}>
                                                        {batsman.name}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">{batsman.dismissal}</TableCell>
                                                <TableCell className="text-right font-bold">{batsman.runs}</TableCell>
                                                <TableCell className="text-right">{batsman.balls}</TableCell>
                                                <TableCell className="text-right">{batsman.fours}</TableCell>
                                                <TableCell className="text-right">{batsman.sixes}</TableCell>
                                                <TableCell className="text-right">{batsman.strikeRate}</TableCell>
                                                </TableRow>
                                            ))}
                                            </TableBody>
                                        </Table>
                                        <Separator className="my-4"/>
                                        <div className="space-y-2 text-sm pr-4">
                                            <div className="flex justify-between">
                                                <span className="font-semibold">Extras</span>
                                                <span>{inning.extras}</span>
                                            </div>
                                            <div className="flex justify-between font-bold text-base">
                                                <span>Total</span>
                                                <span>{inning.total}</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>{inning.bowlingTeamName} Bowling</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <Table>
                                            <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-[200px]">Bowler</TableHead>
                                                <TableHead className="text-right">O</TableHead>
                                                <TableHead className="text-right">M</TableHead>
                                                <TableHead className="text-right">R</TableHead>
                                                <TableHead className="text-right">W</TableHead>
                                                <TableHead className="text-right">NB</TableHead>
                                                <TableHead className="text-right">WD</TableHead>
                                                <TableHead className="text-right">ECO</TableHead>
                                            </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                            {inning.bowlers.map((bowler, i) => (
                                                <TableRow key={i} className="even:bg-slate-50 dark:even:bg-gray-800/20">
                                                <TableCell className="font-medium">
                                                    <span className={bowler.profileId ? "cursor-pointer hover:underline" : ""} onClick={() => handleProfileClick(bowler.profileId)}>
                                                        {bowler.name}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right">{bowler.overs}</TableCell>
                                                <TableCell className="text-right">{bowler.maidens}</TableCell>
                                                <TableCell className="text-right">{bowler.runs}</TableCell>
                                                <TableCell className="text-right font-bold">{bowler.wickets}</TableCell>
                                                <TableCell className="text-right">{bowler.noBalls}</TableCell>
                                                <TableCell className="text-right">{bowler.wides}</TableCell>
                                                <TableCell className="text-right">{bowler.economy}</TableCell>
                                                </TableRow>
                                            ))}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            </div>
                            <div className="lg:col-span-2 space-y-6">
                                {inning.fallOfWickets.length > 0 && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Fall of Wickets</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            {inning.fallOfWickets.map((fow, i) => (
                                                <div key={i} className="text-sm flex justify-between items-center gap-2">
                                                    <div className="flex-1">
                                                        <p className="font-medium">{fow.player}</p>
                                                        <p className="text-xs text-muted-foreground">{fow.over} ov</p>
                                                    </div>
                                                    <p className="font-bold text-lg">{fow.score}</p>
                                                </div>
                                            ))}
                                        </CardContent>
                                    </Card>
                                )}
                                {inning.yetToBat.length > 0 && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Yet to Bat</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                        <p className="text-muted-foreground text-sm">{inning.yetToBat.join(', ')}</p>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        </div>
                    </div>
                </AccordionContent>
            </AccordionItem>
        ))}
      </Accordion>

      <Dialog open={!!selectedProfileId} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-w-4xl h-[90vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle>Player Profile</DialogTitle>
                <DialogDescription>Detailed statistics and information about the player</DialogDescription>
            </DialogHeader>
            {profileLoading && (
                <div className="flex items-center justify-center p-8">
                    <LoaderCircle className="w-8 h-8 animate-spin text-primary" />
                    <p className="ml-4 text-muted-foreground">Loading player profile...</p>
                </div>
            )}
            {selectedProfile && <PlayerProfileDisplay profile={selectedProfile} />}
        </DialogContent>
      </Dialog>

    </div>
  );
}
