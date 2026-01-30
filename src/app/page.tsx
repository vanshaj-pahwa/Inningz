
'use client';

import { useState } from "react";
import LiveMatches from "@/components/live-matches";
import RecentMatches from "@/components/recent-matches";
import UpcomingMatches from "@/components/upcoming-matches";
import SeriesSchedule from "@/components/series-schedule";
import { ThemeToggle } from "@/components/theme-toggle";
import { Flame, History, Calendar, Trophy } from "lucide-react";

type View = 'live' | 'recent' | 'upcoming' | 'series';

const tabs: { value: View; label: string; icon: typeof Flame }[] = [
    { value: 'live', label: 'Live', icon: Flame },
    { value: 'recent', label: 'Recent', icon: History },
    { value: 'upcoming', label: 'Upcoming', icon: Calendar },
    { value: 'series', label: 'Series', icon: Trophy },
];

export default function Home() {
    const [view, setView] = useState<View>('live');

    return (
        <div className="min-h-screen">
            {/* Sticky Header */}
            <header className="sticky top-0 z-50 w-full gradient-border">
                <div className="bg-background/90 backdrop-blur-xl">
                    <div className="max-w-7xl mx-auto px-4 md:px-6">
                        <div className="flex items-center justify-between h-16">
                            {/* Logo */}
                            <h1 className="text-2xl md:text-3xl font-display tracking-tight">
                                <span className="text-primary">Inningz</span>
                            </h1>

                            {/* Navigation Tabs */}
                            <nav className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl">
                                {tabs.map((tab) => {
                                    const Icon = tab.icon;
                                    const isActive = view === tab.value;
                                    return (
                                        <button
                                            key={tab.value}
                                            onClick={() => setView(tab.value)}
                                            className={`
                                                flex items-center gap-1.5 px-3 md:px-4 py-2 rounded-lg text-sm font-medium
                                                transition-all duration-200 ease-out
                                                ${isActive
                                                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                                                    : 'text-muted-foreground hover:text-foreground hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50'
                                                }
                                            `}
                                        >
                                            <Icon className={`w-4 h-4 ${isActive && tab.value === 'live' ? 'animate-pulse' : ''}`} />
                                            <span className="hidden sm:inline">{tab.label}</span>
                                        </button>
                                    );
                                })}
                            </nav>

                            {/* Theme Toggle */}
                            <ThemeToggle />
                        </div>
                    </div>
                </div>
            </header>

            {/* Page Title */}
            <div className="max-w-7xl mx-auto px-4 md:px-6 pt-8 pb-4">
                <h2 className="text-3xl md:text-4xl font-display tracking-tight">
                    {view === 'live' ? 'Live Matches' :
                        view === 'recent' ? 'Recent Matches' :
                            view === 'upcoming' ? 'Upcoming Matches' :
                                'Series Schedule'}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                    {view === 'live' ? 'Currently playing matches' :
                        view === 'recent' ? 'Recently completed matches' :
                            view === 'upcoming' ? 'Upcoming fixtures' :
                                'All cricket series'}
                </p>
            </div>

            {/* Content */}
            <main className="max-w-7xl mx-auto px-4 md:px-6 pb-12">
                <div className="min-h-[70vh]">
                    {view === 'live' && <LiveMatches />}
                    {view === 'recent' && <RecentMatches />}
                    {view === 'upcoming' && <UpcomingMatches />}
                    {view === 'series' && <SeriesSchedule />}
                </div>
            </main>
        </div>
    );
}
