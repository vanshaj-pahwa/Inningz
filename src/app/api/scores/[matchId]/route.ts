import { getScoreForMatchId } from '@/ai/flows/scraper-flow';

const POLL_INTERVAL = 10000; // 10 seconds
const HEARTBEAT_INTERVAL = 30000; // 30 seconds

// Cache for server-side polling
const scoreCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 5000; // 5 seconds

async function getScoreWithCache(matchId: string) {
  const cached = scoreCache.get(matchId);
  const now = Date.now();

  if (cached && now - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const result = await getScoreForMatchId(matchId);
    if (result) {
      scoreCache.set(matchId, { data: result, timestamp: now });
    }
    return result;
  } catch (error) {
    // Return cached data on error if available
    if (cached) {
      return cached.data;
    }
    throw error;
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params;

  if (!matchId) {
    return new Response('Match ID is required', { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        try {
          const message = `data: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        } catch {
          // Controller might be closed
        }
      };

      const sendHeartbeat = () => {
        send({ type: 'heartbeat', timestamp: Date.now() });
      };

      // Initial data fetch
      try {
        const initialData = await getScoreWithCache(matchId);
        send({
          type: 'initial',
          data: initialData,
          timestamp: Date.now(),
        });
      } catch (error) {
        send({
          type: 'error',
          error: error instanceof Error ? error.message : 'Failed to fetch initial data',
          timestamp: Date.now(),
        });
      }

      // Set up polling interval
      const pollInterval = setInterval(async () => {
        try {
          const data = await getScoreWithCache(matchId);
          send({
            type: 'update',
            data,
            timestamp: Date.now(),
          });
        } catch (error) {
          send({
            type: 'error',
            error: error instanceof Error ? error.message : 'Failed to fetch update',
            timestamp: Date.now(),
          });
        }
      }, POLL_INTERVAL);

      // Heartbeat to keep connection alive
      const heartbeatInterval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

      // Cleanup on disconnect
      request.signal.addEventListener('abort', () => {
        clearInterval(pollInterval);
        clearInterval(heartbeatInterval);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}
