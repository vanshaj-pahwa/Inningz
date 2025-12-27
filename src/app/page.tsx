
'use client';

import { useState } from "react";
import LiveMatches from "@/components/live-matches";
import RecentMatches from "@/components/recent-matches";
import UpcomingMatches from "@/components/upcoming-matches";
import { ThemeToggle } from "@/components/theme-toggle";
import { Sidebar, SidebarContent, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarSeparator, SidebarTrigger } from "@/components/ui/sidebar";
import { Flame, History, Calendar } from "lucide-react";

type View = 'live' | 'recent' | 'upcoming';

export default function Home() {
    const [view, setView] = useState<View>('live');

    return (
        <div className="flex w-full">
            <Sidebar className="backdrop-blur-sm bg-white/50 dark:bg-gray-950/50 border-r border-primary/10">
                <SidebarHeader className="p-6">
                    <h1 className="text-3xl font-black font-logo tracking-tight">
                        <span className="bg-gradient-to-r from-primary via-emerald-500 to-primary bg-clip-text text-transparent">
                            Inningz
                        </span>
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">Live Cricket Scores</p>
                </SidebarHeader>
                <SidebarSeparator className="opacity-50" />
                <SidebarContent className="p-4">
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                onClick={() => setView('live')}
                                isActive={view === 'live'}
                                tooltip="Live Matches"
                                className={`transition-all duration-200 ${view === 'live' ? 'bg-primary/10 hover:bg-primary/20' : 'hover:bg-gray-100 dark:hover:bg-gray-800/50'}`}
                            >
                                <Flame className={view === 'live' ? 'text-primary' : ''} />
                                <span>Live</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                onClick={() => setView('recent')}
                                isActive={view === 'recent'}
                                tooltip="Recent Matches"
                                className={`transition-all duration-200 ${view === 'recent' ? 'bg-primary/10 hover:bg-primary/20' : 'hover:bg-gray-100 dark:hover:bg-gray-800/50'}`}
                            >
                                <History className={view === 'recent' ? 'text-primary' : ''} />
                                <span>Recent</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                onClick={() => setView('upcoming')}
                                isActive={view === 'upcoming'}
                                tooltip="Upcoming Matches"
                                className={`transition-all duration-200 ${view === 'upcoming' ? 'bg-primary/10 hover:bg-primary/20' : 'hover:bg-gray-100 dark:hover:bg-gray-800/50'}`}
                            >
                                <Calendar className={view === 'upcoming' ? 'text-primary' : ''} />
                                <span>Upcoming</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarContent>
            </Sidebar>
            <SidebarInset className="relative">
                <div className="sticky top-0 z-10 backdrop-blur-md bg-background/80 border-b border-primary/10">
                    <div className="p-4 md:p-6 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <SidebarTrigger className="md:hidden hover:bg-primary/10" />
                            <div>
                                <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent capitalize">
                                    {view === 'live' ? 'Live Matches' :
                                        view === 'recent' ? 'Recent Matches' :
                                            view === 'upcoming' ? 'Upcoming Matches' : view}
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    {view === 'live' ? 'Currently playing matches' :
                                        view === 'recent' ? 'Recently completed matches' :
                                            view === 'upcoming' ? 'Upcoming fixtures' : ''}
                                </p>
                            </div>
                        </div>
                        <ThemeToggle />
                    </div>
                </div>

                <div className="w-full max-w-7xl mx-auto">
                    <div className="p-4 md:p-6 pt-4">
                        <div className="min-h-[80vh]">
                            {view === 'live' && <LiveMatches />}
                            {view === 'recent' && <RecentMatches />}
                            {view === 'upcoming' && <UpcomingMatches />}
                        </div>
                    </div>
                </div>
            </SidebarInset>
        </div>
    );
}
