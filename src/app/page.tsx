
'use client';

import { Suspense, useCallback, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import LiveMatches from "@/components/live-matches";
import RecentMatches from "@/components/recent-matches";
import UpcomingMatches from "@/components/upcoming-matches";
import SeriesSchedule from "@/components/series-schedule";
import RecentHistory from "@/components/recent-history";
import { ThemeToggle } from "@/components/theme-toggle";
import { Flame, History, Calendar, Trophy, Medal } from "lucide-react";

type View = 'live' | 'recent' | 'upcoming' | 'series';

const validViews: View[] = ['live', 'recent', 'upcoming', 'series'];

const tabs: { value: View; label: string; icon: typeof Flame }[] = [
    { value: 'live', label: 'Live', icon: Flame },
    { value: 'recent', label: 'Recent', icon: History },
    { value: 'upcoming', label: 'Upcoming', icon: Calendar },
    { value: 'series', label: 'Series', icon: Trophy },
];

export default function Home() {
    return (
        <Suspense>
            <HomeContent />
        </Suspense>
    );
}

function HomeContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const tabParam = searchParams.get('tab') as View | null;
    const initialView: View = tabParam && validViews.includes(tabParam) ? tabParam : 'live';
    const [view, setView] = useState<View>(initialView);

    const switchView = useCallback((newView: View) => {
        setView(newView);
        const params = new URLSearchParams(searchParams.toString());
        if (newView === 'live') {
            params.delete('tab');
        } else {
            params.set('tab', newView);
        }
        const query = params.toString();
        router.replace(query ? `/?${query}` : '/', { scroll: false });
    }, [router, searchParams]);

    return (
        <div className="min-h-screen stadium-glow">
            {/* Sticky Header - Glass Nav */}
            <header className="sticky top-0 z-50 w-full glass-nav">
                <div className="max-w-7xl mx-auto px-4 md:px-6">
                    {/* Top row: Logo + Actions */}
                    <div className="flex items-center justify-between h-14 md:h-16">
                        <h1 className="text-2xl md:text-3xl font-display tracking-tight">
                            <span className="text-primary">Inningz</span>
                        </h1>

                        {/* Desktop: inline nav tabs */}
                        <nav className="hidden md:flex items-center gap-1 p-1 rounded-xl" style={{ background: 'rgba(120, 120, 128, 0.12)' }}>
                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                const isActive = view === tab.value;
                                return (
                                    <button
                                        key={tab.value}
                                        onClick={() => switchView(tab.value)}
                                        className={`
                                            flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium
                                            transition-all duration-200 ease-out
                                            ${isActive
                                                ? 'active-tab'
                                                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                                            }
                                        `}
                                    >
                                        <Icon className={`w-4 h-4 ${isActive && tab.value === 'live' ? 'animate-pulse' : ''}`} />
                                        <span>{tab.label}</span>
                                    </button>
                                );
                            })}
                        </nav>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5">
                            <Link
                                href="/rankings"
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            >
                                <Medal className="w-4 h-4" />
                                <span className="hidden sm:inline">Rankings</span>
                            </Link>
                            <ThemeToggle />
                        </div>
                    </div>

                    {/* Mobile: iOS-style segmented control */}
                    <nav className="md:hidden pb-3">
                        <div className="flex p-1 rounded-lg bg-muted">
                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                const isActive = view === tab.value;
                                return (
                                    <button
                                        key={tab.value}
                                        onClick={() => switchView(tab.value)}
                                        className={`
                                            flex-1 flex flex-col items-center justify-center gap-0.5 py-2 rounded-md text-[10px] font-medium
                                            transition-all duration-200
                                            ${isActive
                                                ? 'bg-primary text-white'
                                                : 'text-muted-foreground'
                                            }
                                        `}
                                    >
                                        <Icon className={`w-4 h-4 ${isActive && tab.value === 'live' ? 'animate-pulse' : ''}`} />
                                        <span>{tab.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </nav>
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

            {/* Recent History */}
            <div className="max-w-7xl mx-auto px-4 md:px-6 pb-4">
                <RecentHistory />
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
