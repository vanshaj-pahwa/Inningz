'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, TrendingUp, Users, Trophy, ExternalLink, Newspaper, Star, MessageSquare, BarChart3, Mic, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCricketNews, type NewsItem } from '@/app/actions';
import NewsDetail from './news-detail';

const categories = ['All', 'Breaking', 'News', 'Match', 'Player', 'Tournament', 'Premium', 'Spotlight', 'Opinions', 'Special', 'Stats', 'Interviews', 'Live Blogs', 'General'] as const;

export default function CricketNews() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<typeof categories[number]>('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        setLoading(true);
        const result = await getCricketNews();
        if (result.success && result.news) {
          setNews(result.news);
        } else {
          setError(result.error || 'Failed to fetch news');
        }
      } catch (err) {
        setError('Failed to fetch cricket news');
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  const filteredNews = activeCategory === 'All'
    ? news
    : news.filter(item => item.category === activeCategory);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Breaking': return <TrendingUp className="w-3 h-3" />;
      case 'News': return <Newspaper className="w-3 h-3" />;
      case 'Match': return <Trophy className="w-3 h-3" />;
      case 'Player': return <Users className="w-3 h-3" />;
      case 'Tournament': return <Trophy className="w-3 h-3" />;
      case 'Premium': return <Star className="w-3 h-3" />;
      case 'Spotlight': return <Star className="w-3 h-3" />;
      case 'Opinions': return <MessageSquare className="w-3 h-3" />;
      case 'Special': return <Star className="w-3 h-3" />;
      case 'Stats': return <BarChart3 className="w-3 h-3" />;
      case 'Interviews': return <Mic className="w-3 h-3" />;
      case 'Live Blogs': return <Radio className="w-3 h-3" />;
      default: return <Clock className="w-3 h-3" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Breaking': return 'bg-red-100 hover:bg-red-100/80 text-red-700 dark:bg-red-500/20 dark:text-red-400';
      case 'News': return 'bg-blue-100 hover:bg-blue-100/80 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400';
      case 'Match': return 'bg-blue-100 hover:bg-blue-100/80 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400';
      case 'Player': return 'bg-green-100 hover:bg-green-100/80 text-green-700 dark:bg-green-500/20 dark:text-green-400';
      case 'Tournament': return 'bg-purple-100 hover:bg-purple-100/80 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400';
      case 'Premium': return 'bg-yellow-100 hover:bg-yellow-100/80 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400';
      case 'Spotlight': return 'bg-orange-100 hover:bg-orange-100/80 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400';
      case 'Opinions': return 'bg-indigo-100 hover:bg-indigo-100/80 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400';
      case 'Special': return 'bg-pink-100 hover:bg-pink-100/80 text-pink-700 dark:bg-pink-500/20 dark:text-pink-400';
      case 'Stats': return 'bg-teal-100 hover:bg-teal-100/80 text-teal-700 dark:bg-teal-500/20 dark:text-teal-400';
      case 'Interviews': return 'bg-cyan-100 hover:bg-cyan-100/80 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-400';
      case 'Live Blogs': return 'bg-emerald-100 hover:bg-emerald-100/80 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400';
      default: return 'bg-gray-100 hover:bg-gray-100/80 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  // If a news item is selected, show the detail view
  if (selectedNews) {
    return <NewsDetail newsItem={selectedNews} onBack={() => setSelectedNews(null)} />;
  }

  return (
    <div className="space-y-4 md:space-y-6">

      {/* Category Filter */}
      <div className="w-full overflow-x-auto pb-2 hide-scrollbar">
        <div className="flex gap-1 bg-gray-100/50 dark:bg-gray-800/30 p-1 rounded-lg backdrop-blur-sm min-w-max">
          {categories.map(category => (
            <Button
              key={category}
              variant={activeCategory === category ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveCategory(category)}
              className="text-xs px-2 py-1 whitespace-nowrap flex-shrink-0 h-8"
            >
              {category}
            </Button>
          ))}
        </div>
      </div>

      {/* News List */}
      <div className="space-y-3 md:space-y-4">
        {filteredNews.map((item, index) => (
          <Card
            key={`${item.id}-${index}`}
            className="group hover:shadow-lg transition-all duration-300 cursor-pointer bg-white/50 dark:bg-gray-950/50 backdrop-blur-sm border-primary/10 hover:border-primary/30"
            onClick={() => setSelectedNews(item)}
          >
            <CardContent className="p-3 md:p-4">
              <div className="flex items-start gap-3">
                {item.imageUrl && (
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={`text-xs px-2 py-0.5 ${getCategoryColor(item.category)}`}>
                      <span className="flex items-center gap-1">
                        {getCategoryIcon(item.category)}
                        {item.newsType || item.category}
                      </span>
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {item.timestamp}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm md:text-base leading-tight group-hover:text-primary transition-colors line-clamp-2">
                    {item.title}
                  </h3>

                  <p className="text-xs md:text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                    {item.summary}
                  </p>

                  <div className="flex items-center justify-start">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs p-1 h-auto text-primary hover:text-primary/80"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedNews(item);
                      }}
                    >
                      Read Full Article
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredNews.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No news available for this category.</p>
        </div>
      )}
    </div>
  );
}