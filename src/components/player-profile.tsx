
'use client';

import type { PlayerProfile } from '@/app/actions';
import Image from 'next/image';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';

export default function PlayerProfileDisplay({ profile }: { profile: PlayerProfile }) {
  if (!profile) {
    return null;
  }

  const { info, bio, rankings, battingStats, bowlingStats } = profile;

  return (
    <div className="space-y-6 p-1">
      <Card className="overflow-hidden">
        <div className="relative h-32 bg-slate-100 dark:bg-slate-800">
            {info.imageUrl && (
                <Image 
                    src={info.imageUrl} 
                    alt={info.name} 
                    fill
                    className="opacity-20 blur-sm object-cover"
                />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end gap-4">
                {info.imageUrl && (
                    <Image 
                        src={info.imageUrl} 
                        alt={info.name} 
                        width={80} 
                        height={80}
                        style={{
                          width: '80px',
                          height: '80px'
                        }}
                        className="rounded-full border-4 border-background bg-background shrink-0" 
                    />
                )}
                <div className="space-y-1">
                     <h1 className="text-3xl font-bold text-foreground">{info.name}</h1>
                     <p className="text-lg text-muted-foreground">{info.country}</p>
                </div>
            </div>
        </div>
      </Card>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
            <Card>
                <CardHeader><CardTitle>Personal Information</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between"><span className="font-semibold text-foreground/80">Born</span> <span className="text-muted-foreground text-right">{info.personal.born}</span></div>
                    <div className="flex justify-between"><span className="font-semibold text-foreground/80">Birth Place</span> <span className="text-muted-foreground text-right">{info.personal.birthPlace}</span></div>
                    <div className="flex justify-between"><span className="font-semibold text-foreground/80">Height</span> <span className="text-muted-foreground text-right">{info.personal.height}</span></div>
                    <Separator/>
                    <div className="flex justify-between"><span className="font-semibold text-foreground/80">Role</span> <span className="text-muted-foreground text-right">{info.personal.role}</span></div>
                    <div className="flex justify-between"><span className="font-semibold text-foreground/80">Batting Style</span> <span className="text-muted-foreground text-right">{info.personal.battingStyle}</span></div>
                    <div className="flex justify-between"><span className="font-semibold text-foreground/80">Bowling Style</span> <span className="text-muted-foreground text-right">{info.personal.bowlingStyle}</span></div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle>ICC Rankings</CardTitle></CardHeader>
                <CardContent>
                    <div>
                        <h4 className="font-semibold mb-2 text-primary">Batting</h4>
                        <div className="flex justify-around text-sm">
                            <div className="text-center"><p className="font-bold text-lg">{rankings.batting.test}</p><p className="text-xs text-muted-foreground">Test</p></div>
                            <div className="text-center"><p className="font-bold text-lg">{rankings.batting.odi}</p><p className="text-xs text-muted-foreground">ODI</p></div>
                            <div className="text-center"><p className="font-bold text-lg">{rankings.batting.t20}</p><p className="text-xs text-muted-foreground">T20</p></div>
                        </div>
                    </div>
                    <Separator className="my-4" />
                     <div>
                        <h4 className="font-semibold mb-2 text-primary">Bowling</h4>
                        <div className="flex justify-around text-sm">
                            <div className="text-center"><p className="font-bold text-lg">{rankings.bowling.test}</p><p className="text-xs text-muted-foreground">Test</p></div>
                            <div className="text-center"><p className="font-bold text-lg">{rankings.bowling.odi}</p><p className="text-xs text-muted-foreground">ODI</p></div>
                            <div className="text-center"><p className="font-bold text-lg">{rankings.bowling.t20}</p><p className="text-xs text-muted-foreground">T20</p></div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
        <div className="lg:col-span-2 space-y-6">
            <Card>
                <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
                <CardContent>
                    <div className="text-sm text-foreground/90 leading-relaxed prose prose-sm dark:prose-invert max-w-full" dangerouslySetInnerHTML={{ __html: bio }} />
                </CardContent>
            </Card>
             <Card>
                <CardHeader><CardTitle>Teams</CardTitle></CardHeader>
                <CardContent><p className="text-sm text-muted-foreground">{info.teams}</p></CardContent>
            </Card>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Batting Career Summary</CardTitle></CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Format</TableHead>
                        <TableHead className="text-right">M</TableHead>
                        <TableHead className="text-right">Inn</TableHead>
                        <TableHead className="text-right">Runs</TableHead>
                        <TableHead className="text-right">HS</TableHead>
                        <TableHead className="text-right">Avg</TableHead>
                        <TableHead className="text-right">SR</TableHead>
                        <TableHead className="text-right">100s</TableHead>
                        <TableHead className="text-right">50s</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {battingStats.map(stat => (
                        <TableRow key={stat.format} className="even:bg-slate-50 dark:even:bg-gray-800/20">
                            <TableCell className="font-semibold">{stat.format}</TableCell>
                            <TableCell className="text-right">{stat.matches}</TableCell>
                            <TableCell className="text-right">{stat.innings}</TableCell>
                            <TableCell className="text-right font-bold">{stat.runs}</TableCell>
                            <TableCell className="text-right">{stat.highest}</TableCell>
                            <TableCell className="text-right">{stat.average}</TableCell>
                            <TableCell className="text-right">{stat.strikeRate}</TableCell>
                            <TableCell className="text-right">{stat.hundreds}</TableCell>
                            <TableCell className="text-right">{stat.fifties}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Bowling Career Summary</CardTitle></CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Format</TableHead>
                        <TableHead className="text-right">M</TableHead>
                        <TableHead className="text-right">Inn</TableHead>
                        <TableHead className="text-right">Wkts</TableHead>
                        <TableHead className="text-right">BBI</TableHead>
                        <TableHead className="text-right">Avg</TableHead>
                        <TableHead className="text-right">Econ</TableHead>
                        <TableHead className="text-right">SR</TableHead>
                        <TableHead className="text-right">5W</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {bowlingStats.map(stat => (
                        <TableRow key={stat.format} className="even:bg-slate-50 dark:even:bg-gray-800/20">
                            <TableCell className="font-semibold">{stat.format}</TableCell>
                            <TableCell className="text-right">{stat.matches}</TableCell>
                            <TableCell className="text-right">{stat.innings}</TableCell>
                            <TableCell className="text-right font-bold">{stat.wickets}</TableCell>
                            <TableCell className="text-right">{stat.bbi}</TableCell>
                            <TableCell className="text-right">{stat.average}</TableCell>
                            <TableCell className="text-right">{stat.economy}</TableCell>
                            <TableCell className="text-right">{stat.strikeRate}</TableCell>
                            <TableCell className="text-right">{stat.fiveWickets}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </CardContent>
      </Card>

    </div>
  );
}
