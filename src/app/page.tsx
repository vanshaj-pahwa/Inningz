
'use client';

import { Suspense, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, LayoutGroup } from "framer-motion";
import LiveMatches from "@/components/live-matches";
import RecentMatches from "@/components/recent-matches";
import UpcomingMatches from "@/components/upcoming-matches";
import SeriesSchedule from "@/components/series-schedule";
import RecentHistory from "@/components/recent-history";
import { ThemeToggle } from "@/components/theme-toggle";
import FollowingButton from "@/components/following-button";

import { CommandPaletteTrigger } from "@/components/command-palette";
import { Radio, History, Calendar, Trophy, Medal, Home as HomeIcon } from "lucide-react";
import HomeDashboard from "@/components/home-dashboard";

type View = 'home' | 'live' | 'recent' | 'upcoming' | 'series';

const validViews: View[] = ['home', 'live', 'recent', 'upcoming', 'series'];

const tabs: { value: View; label: string; icon: typeof Radio }[] = [
    { value: 'home', label: 'Home', icon: HomeIcon },
    { value: 'live', label: 'Live', icon: Radio },
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
    const view: View = tabParam && validViews.includes(tabParam) ? tabParam : 'home';

    const switchView = useCallback((newView: View) => {
        const params = new URLSearchParams(searchParams.toString());
        if (newView === 'home') {
            params.delete('tab');
        } else {
            params.set('tab', newView);
        }
        const query = params.toString();
        // push (not replace) so the hardware/browser Back button steps through tab
        // switches instead of exiting the home page.
        router.push(query ? `/?${query}` : '/', { scroll: false });
    }, [router, searchParams]);

    return (
        <div className="min-h-screen stadium-glow">
            {/* Sticky Header - Glass Nav */}
            <header className="sticky top-0 z-50 w-full glass-nav">
                <div className="max-w-7xl mx-auto px-4 md:px-6">
                    {/* Top row: Logo + Actions */}
                    <div className="flex items-center justify-between h-14 md:h-16">
                        <Link
                            href="/"
                            aria-label="Inningz home"
                            onClick={(e) => { e.preventDefault(); switchView('home'); }}
                        >
                            <Image
                                src="/logo-full-transparent.png"
                                alt="Inningz"
                                width={400}
                                height={120}
                                priority
                                className="hidden dark:block h-9 md:h-11 w-auto"
                            />
                            <Image
                                src="/logo-full-dark.png"
                                alt="Inningz"
                                width={400}
                                height={120}
                                priority
                                className="block dark:hidden h-9 md:h-11 w-auto"
                            />
                        </Link>

                        {/* Desktop: inline nav tabs */}
                        <LayoutGroup id="desktop-nav">
                            <nav className="hidden lg:flex items-center gap-1 p-1 rounded-xl" style={{ background: 'rgba(120, 120, 128, 0.12)' }}>
                                {tabs.map((tab) => {
                                    const Icon = tab.icon;
                                    const isActive = view === tab.value;
                                    return (
                                        <button
                                            key={tab.value}
                                            onClick={() => switchView(tab.value)}
                                            aria-current={isActive ? 'page' : undefined}
                                            className={`relative flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${isActive ? 'active-tab' : 'text-muted-foreground hover:text-foreground'}`}
                                        >
                                            {isActive && (
                                                <motion.span
                                                    layoutId="desktop-nav-active"
                                                    transition={{ type: 'spring', stiffness: 360, damping: 30 }}
                                                    className="absolute inset-0 rounded-lg bg-primary/15 ring-1 ring-primary/30"
                                                />
                                            )}
                                            <Icon className={`relative z-10 w-4 h-4 ${isActive && tab.value === 'live' ? 'animate-pulse' : ''}`} />
                                            <span className="relative z-10">{tab.label}</span>
                                        </button>
                                    );
                                })}
                            </nav>
                        </LayoutGroup>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5">
                            <CommandPaletteTrigger />
                            <Link
                                href="/rankings"
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            >
                                <Medal className="w-4 h-4" />
                                <span className="hidden sm:inline">Rankings</span>
                            </Link>
                            <FollowingButton />
                            <ThemeToggle />
                        </div>
                    </div>

                    {/* Mobile: iOS-style segmented control */}
                    <LayoutGroup id="mobile-nav">
                        <nav className="hidden">
                            <div className="flex p-1 rounded-lg bg-muted">
                                {tabs.map((tab) => {
                                    const Icon = tab.icon;
                                    const isActive = view === tab.value;
                                    return (
                                        <button
                                            key={tab.value}
                                            onClick={() => switchView(tab.value)}
                                            aria-current={isActive ? 'page' : undefined}
                                            className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 py-2 rounded-md text-[10px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${isActive ? 'text-white' : 'text-muted-foreground'}`}
                                        >
                                            {isActive && (
                                                <motion.span
                                                    layoutId="mobile-nav-active"
                                                    transition={{ type: 'spring', stiffness: 360, damping: 30 }}
                                                    className="absolute inset-0 rounded-md bg-primary"
                                                />
                                            )}
                                            <Icon className={`relative z-10 w-4 h-4 ${isActive && tab.value === 'live' ? 'animate-pulse' : ''}`} />
                                            <span className="relative z-10">{tab.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </nav>
                    </LayoutGroup>
                </div>
            </header>

            {/* Page Title - hidden on Home tab */}
            {view !== 'home' && (
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
            )}

            {/* Recent History - only shown on non-home tabs */}
            {view !== 'home' && (
                <div className="max-w-7xl mx-auto px-4 md:px-6 pb-4">
                    <RecentHistory />
                </div>
            )}

            {/* Content */}
            <main className="max-w-7xl mx-auto px-4 md:px-6 pb-12">
                <div className="min-h-[70vh]">
                    {view === 'home' && <HomeDashboard />}
                    {view === 'live' && <LiveMatches />}
                    {view === 'recent' && <RecentMatches />}
                    {view === 'upcoming' && <UpcomingMatches />}
                    {view === 'series' && <SeriesSchedule />}
                </div>
            </main>
        </div>
    );
}
