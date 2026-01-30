'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getSeriesSchedule } from '@/app/actions';
import type { SeriesSchedule, CricketSeries } from '@/app/actions';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Trophy, Calendar, ChevronDown, Filter } from "lucide-react";

type SeriesFilter = 'all' | 'international' | 'league' | 'domestic' | 'women';

const filters: { value: SeriesFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'international', label: 'International' },
  { value: 'league', label: 'League' },
  { value: 'domestic', label: 'Domestic' },
  { value: 'women', label: 'Women' },
];

const categoryColors: Record<SeriesFilter, string> = {
  international: 'bg-blue-500',
  league: 'bg-purple-500',
  domestic: 'bg-orange-500',
  women: 'bg-pink-500',
  all: '',
};

const categoryTextColors: Record<SeriesFilter, string> = {
  international: 'text-blue-400',
  league: 'text-purple-400',
  domestic: 'text-orange-400',
  women: 'text-pink-400',
  all: '',
};

export default function SeriesScheduleComponent() {
  const [schedule, setSchedule] = useState<SeriesSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<SeriesFilter>('all');
  const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()));

  // Extract available years from schedule data
  const availableYears = useMemo(() => {
    if (!schedule?.months) return [];
    const years = new Set<string>();
    schedule.months.forEach(m => {
      const year = m.name.split(' ').pop();
      if (year) years.add(year);
    });
    return Array.from(years).sort((a, b) => parseInt(b) - parseInt(a));
  }, [schedule]);

  useEffect(() => {
    const fetchSchedule = async () => {
      setLoading(true);
      setError(null);
      const result = await getSeriesSchedule();
      if (result.success && result.data) {
        setSchedule(result.data);
      } else {
        setError(result.error ?? "Failed to fetch series schedule.");
      }
      setLoading(false);
    };
    fetchSchedule();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <FilterBar
          activeFilter={activeFilter}
          setActiveFilter={setActiveFilter}
          selectedYear={selectedYear}
          setSelectedYear={setSelectedYear}
          availableYears={availableYears}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="skeleton h-24 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full flex items-center justify-center min-h-[60vh]">
        <Alert variant="destructive" className="max-w-xl rounded-2xl">
          <AlertTitle className="text-lg">Unable to fetch series</AlertTitle>
          <AlertDescription className="mt-2">{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!schedule || !schedule.months || schedule.months.length === 0) {
    return (
      <div className="w-full flex flex-col items-center justify-center min-h-[60vh] p-8">
        <div className="p-5 rounded-full bg-primary/10 mb-5">
          <Trophy className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-xl font-display mb-2">No series found</h3>
        <p className="text-muted-foreground text-center max-w-sm text-sm">
          Check back later for upcoming cricket series
        </p>
      </div>
    );
  }

  // Filter by year and category
  const filteredMonths = schedule.months
    .filter(month => {
      const year = month.name.split(' ').pop();
      return selectedYear === 'all' || year === selectedYear;
    })
    .map(month => ({
      ...month,
      series: activeFilter === 'all'
        ? month.series
        : month.series.filter(s => s.category === activeFilter),
    }))
    .filter(month => month.series.length > 0);

  return (
    <div className="space-y-10">
      <FilterBar
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
        selectedYear={selectedYear}
        setSelectedYear={setSelectedYear}
        availableYears={availableYears}
      />

      {filteredMonths.length === 0 && (
        <div className="w-full flex flex-col items-center justify-center min-h-[40vh] p-8">
          <div className="p-5 rounded-full bg-primary/10 mb-5">
            <Trophy className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl font-display mb-2">No series found</h3>
          <p className="text-muted-foreground text-center max-w-sm text-sm">
            Try selecting a different filter
          </p>
        </div>
      )}

      {filteredMonths.map((month) => (
        <section key={month.name}>
          {/* Month Header */}
          <div className="flex items-center gap-3 mb-5">
            <div className="h-px flex-1 bg-gradient-to-r from-primary/30 to-transparent" />
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">
              <Calendar className="w-3.5 h-3.5" />
              {month.name}
            </h3>
            <div className="h-px flex-1 bg-gradient-to-l from-primary/30 to-transparent" />
          </div>

          {/* Series Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {month.series.map((series, index) => (
              <SeriesCard key={series.seriesId} series={series} index={index} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function SeriesCard({ series, index }: { series: CricketSeries; index: number }) {
  return (
    <Link
      href={`/series/${series.seriesId}/${series.seriesUrl.replace(/^\/cricket-series\/\d+\//, '').replace(/\/matches$/, '')}`}
      className="stagger-in"
      style={{ '--stagger-index': index } as React.CSSProperties}
    >
      <div className="glass-card card-hover p-5 h-full">
        {/* Category badge */}
        <div className="flex items-center justify-between mb-3">
          <span className="flex items-center gap-1.5 text-xs font-medium">
            <span className={`w-1.5 h-1.5 rounded-full ${categoryColors[series.category]}`} />
            <span className={categoryTextColors[series.category]}>
              {series.category.charAt(0).toUpperCase() + series.category.slice(1)}
            </span>
          </span>
        </div>

        {/* Series Name */}
        <h4 className="text-sm font-semibold text-foreground leading-snug mb-2">
          {series.name}
        </h4>

        {/* Date Range */}
        {series.dateRange && (
          <p className="text-xs text-muted-foreground">
            {series.dateRange}
          </p>
        )}
      </div>
    </Link>
  );
}

function FilterBar({
  activeFilter,
  setActiveFilter,
  selectedYear,
  setSelectedYear,
  availableYears,
}: {
  activeFilter: SeriesFilter;
  setActiveFilter: (f: SeriesFilter) => void;
  selectedYear: string;
  setSelectedYear: (y: string) => void;
  availableYears: string[];
}) {
  const activeLabel = filters.find(f => f.value === activeFilter)?.label ?? 'All';
  const yearLabel = selectedYear === 'all' ? 'All Years' : selectedYear;

  return (
    <div className="flex items-center justify-between gap-4">
      {/* Desktop: inline pills */}
      <div className="hidden md:flex gap-2">
        {filters.map((filter) => (
          <button
            key={filter.value}
            onClick={() => setActiveFilter(filter.value)}
            className={`
              shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200
              ${activeFilter === filter.value
                ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                : 'bg-zinc-100 dark:bg-zinc-900 text-muted-foreground hover:text-foreground hover:bg-zinc-200 dark:hover:bg-zinc-800 border border-transparent'
              }
            `}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 md:gap-4 ml-auto">
        {/* Year dropdown */}
        {availableYears.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="rounded-xl gap-2">
                <Calendar className="h-3.5 w-3.5" />
                {yearLabel}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl">
              <DropdownMenuRadioGroup value={selectedYear} onValueChange={setSelectedYear}>
                <DropdownMenuRadioItem value="all" className="rounded-lg">
                  All Years
                </DropdownMenuRadioItem>
                {availableYears.map((year) => (
                  <DropdownMenuRadioItem key={year} value={year} className="rounded-lg">
                    {year}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {/* Category filter dropdown (mobile) */}
        <div className="md:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="rounded-xl gap-2">
                <Filter className="h-3.5 w-3.5" />
                {activeLabel}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl">
              <DropdownMenuRadioGroup value={activeFilter} onValueChange={(v) => setActiveFilter(v as SeriesFilter)}>
                {filters.map((filter) => (
                  <DropdownMenuRadioItem key={filter.value} value={filter.value} className="rounded-lg">
                    {filter.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
