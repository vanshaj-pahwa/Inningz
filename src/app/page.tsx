
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
      <Sidebar>
        <SidebarHeader>
           <h1 className="text-3xl font-bold font-logo tracking-tight bg-gradient-to-r from-primary via-emerald-500 to-primary bg-clip-text text-transparent">
              Inningz
          </h1>
        </SidebarHeader>
        <SidebarSeparator />
        <SidebarContent className="p-2">
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => setView('live')} isActive={view === 'live'} tooltip="Live Matches">
                        <Flame />
                        <span>Live</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => setView('recent')} isActive={view === 'recent'} tooltip="Recent Matches">
                        <History />
                        <span>Recent</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => setView('upcoming')} isActive={view === 'upcoming'} tooltip="Upcoming Matches">
                        <Calendar />
                        <span>Upcoming</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <SidebarInset className="p-4 md:p-6">
        <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
                 <SidebarTrigger className="md:hidden" />
                 <h2 className="text-2xl font-semibold capitalize">{view} Matches</h2>
            </div>
            <ThemeToggle />
        </div>
        
        <div className="w-full">
            <div>
              {view === 'live' && <LiveMatches />}
              {view === 'recent' && <RecentMatches />}
              {view === 'upcoming' && <UpcomingMatches />}
            </div>
        </div>
      </SidebarInset>
    </div>
  );
}
