'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Clock, Calendar, Share2 } from 'lucide-react';
import { getNewsContent, type NewsItem } from '@/app/actions';

interface NewsDetailProps {
  newsItem: NewsItem;
  onBack: () => void;
  shareUrl?: string;
}

// Utility function to convert image URL to larger format
const getLargeImageUrl = (imageUrl: string): string => {
  if (!imageUrl) return '';
  
  // Check if it's a Cricbuzz image URL
  if (imageUrl.includes('static.cricbuzz.com/a/img/v1/')) {
    // Replace the dimensions with 595x396 for article detail view
    return imageUrl.replace(/\/\d+x\d+\//, '/595x396/');
  }
  
  return imageUrl;
};

export default function NewsDetail({ newsItem, onBack, shareUrl }: NewsDetailProps) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true);
        const result = await getNewsContent(newsItem.url);
        if (result.success && result.content) {
          setContent(result.content);
        } else {
          setError(result.error || 'Failed to fetch news content');
        }
      } catch (err) {
        setError('Failed to fetch news content');
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [newsItem.url]);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Breaking': return 'bg-red-100 hover:bg-red-100/80 text-red-700 dark:bg-red-500/20 dark:text-red-400';
      case 'Match': return 'bg-blue-100 hover:bg-blue-100/80 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400';
      case 'Player': return 'bg-green-100 hover:bg-green-100/80 text-green-700 dark:bg-green-500/20 dark:text-green-400';
      case 'Tournament': return 'bg-purple-100 hover:bg-purple-100/80 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400';
      case 'News': return 'bg-blue-100 hover:bg-blue-100/80 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400';
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

  const handleShare = async () => {
    const urlToShare = shareUrl || `${window.location.origin}/news/${newsItem.id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: newsItem.title,
          text: newsItem.summary,
          url: urlToShare,
        });
      } catch (err) {
        // Fallback to clipboard
        navigator.clipboard.writeText(urlToShare);
      }
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(urlToShare);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to News
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleShare}
          className="flex items-center gap-2 ml-auto"
        >
          <Share2 className="w-4 h-4" />
          Share
        </Button>
      </div>

      {/* Article */}
      <Card className="bg-white/50 dark:bg-gray-950/50 backdrop-blur-sm border-primary/10">
        <CardHeader className="space-y-4">
          {/* Meta Information */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={`text-xs px-2 py-0.5 ${getCategoryColor(newsItem.category)}`}>
              {newsItem.newsType || newsItem.category}
            </Badge>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {newsItem.timestamp}
            </span>
          </div>

          {/* Title */}
          <CardTitle className="text-2xl md:text-3xl font-bold leading-tight">
            {newsItem.title}
          </CardTitle>

          {/* Summary */}
          <p className="text-lg text-muted-foreground leading-relaxed">
            {newsItem.summary}
          </p>

          {/* Featured Image */}
          {newsItem.imageUrl && (
            <div className="w-full rounded-lg overflow-hidden">
              <img
                src={getLargeImageUrl(newsItem.imageUrl)}
                alt={newsItem.title}
                className="w-full h-auto object-cover"
                loading="lazy"
              />
            </div>
          )}
        </CardHeader>

        <CardContent className="pt-0">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="ml-4 text-muted-foreground">Loading article content...</p>
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <p className="text-red-500 mb-4">{error}</p>
              <p className="text-muted-foreground">Unable to load the full article content.</p>
            </div>
          )}

          {content && !loading && (
            <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none">
              <div dangerouslySetInnerHTML={{ __html: content }} />
            </div>
          )}
        </CardContent>
      </Card>


    </div>
  );
}