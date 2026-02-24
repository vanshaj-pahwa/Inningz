'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { LoaderCircle, Play, Pause, Volume2, VolumeX, Maximize, Minimize, Radio, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';

interface LiveStreamPlayerProps {
    streamUrl: string;
    title?: string;
}

export default function LiveStreamPlayer({ streamUrl, title }: LiveStreamPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const hlsRef = useRef<Hls | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [status, setStatus] = useState<'loading' | 'playing' | 'paused' | 'error'>('loading');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isMuted, setIsMuted] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const controlsTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [retryCount, setRetryCount] = useState(0);

    const hideControlsLater = useCallback(() => {
        if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
        controlsTimeout.current = setTimeout(() => {
            if (status === 'playing') setShowControls(false);
        }, 3000);
    }, [status]);

    const handleMouseMove = useCallback(() => {
        setShowControls(true);
        hideControlsLater();
    }, [hideControlsLater]);

    const initPlayer = useCallback(() => {
        const video = videoRef.current;
        if (!video || !streamUrl) return;

        // Cleanup previous instance
        if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
        }

        setStatus('loading');
        setErrorMessage(null);

        // Native HLS support (Safari/iOS)
        if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = streamUrl;
            video.addEventListener('loadedmetadata', () => {
                video.play().then(() => setStatus('playing')).catch(() => setStatus('paused'));
            });
            video.addEventListener('error', () => {
                setErrorMessage('Stream playback failed.');
                setStatus('error');
            });
            return;
        }

        // hls.js for Chrome/Firefox/Edge
        if (Hls.isSupported()) {
            const hls = new Hls({
                enableWorker: true,
                lowLatencyMode: true,
                maxBufferLength: 10,
                maxMaxBufferLength: 30,
            });
            hlsRef.current = hls;

            hls.loadSource(streamUrl);
            hls.attachMedia(video);

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                video.play().then(() => setStatus('playing')).catch(() => setStatus('paused'));
            });

            hls.on(Hls.Events.ERROR, (_, data) => {
                console.log('[HLS] Error:', data.type, data.details, data.fatal);
                if (data.fatal) {
                    if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                        setErrorMessage('Network error - stream may be unavailable or geo-restricted.');
                        hls.startLoad(); // Try to recover
                    } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
                        hls.recoverMediaError();
                        return; // Don't set error state for recoverable errors
                    } else {
                        setErrorMessage('Stream playback failed.');
                        hls.destroy();
                    }
                    setStatus('error');
                }
            });

            return () => {
                hls.destroy();
                hlsRef.current = null;
            };
        }

        setErrorMessage('HLS playback is not supported in this browser.');
        setStatus('error');
    }, [streamUrl]);

    useEffect(() => {
        initPlayer();
        return () => {
            if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
            }
        };
    }, [initPlayer]);

    const togglePlay = () => {
        const video = videoRef.current;
        if (!video) return;
        if (video.paused) {
            video.play().then(() => setStatus('playing'));
        } else {
            video.pause();
            setStatus('paused');
        }
    };

    const toggleMute = () => {
        const video = videoRef.current;
        if (!video) return;
        video.muted = !video.muted;
        setIsMuted(video.muted);
    };

    const toggleFullscreen = async () => {
        const container = containerRef.current;
        if (!container) return;
        if (document.fullscreenElement) {
            await document.exitFullscreen();
            setIsFullscreen(false);
        } else {
            await container.requestFullscreen();
            setIsFullscreen(true);
        }
    };

    return (
        <div
            ref={containerRef}
            className="relative w-full aspect-video bg-black rounded-xl overflow-hidden group"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => status === 'playing' && setShowControls(false)}
        >
            {/* Video Element */}
            <video
                ref={videoRef}
                className="w-full h-full object-contain"
                playsInline
                muted={isMuted}
                onClick={togglePlay}
            />

            {/* Loading Overlay */}
            {status === 'loading' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
                    <LoaderCircle className="w-10 h-10 text-cyan-400 animate-spin mb-3" />
                    <p className="text-sm text-white/70">Loading stream...</p>
                </div>
            )}

            {/* Error Overlay */}
            {status === 'error' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-3">
                    <AlertTriangle className="w-10 h-10 text-orange-400" />
                    <p className="text-sm text-white/70 text-center px-4">{errorMessage || 'Stream error'}</p>
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => {
                            setRetryCount(prev => prev + 1);
                            initPlayer();
                        }}
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Retry
                    </Button>
                </div>
            )}

            {/* Controls Overlay */}
            {(showControls || status === 'paused') && status !== 'loading' && status !== 'error' && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 transition-opacity">
                    {/* Top bar */}
                    <div className="absolute top-0 left-0 right-0 p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-600/90 backdrop-blur-sm">
                                <Radio className="w-3 h-3 text-white animate-pulse" />
                                <span className="text-[11px] font-bold text-white tracking-wide">LIVE</span>
                            </div>
                            {title && (
                                <span className="text-xs text-white/80 font-medium truncate max-w-[200px]">{title}</span>
                            )}
                        </div>
                    </div>

                    {/* Center play/pause */}
                    <button
                        className="absolute inset-0 flex items-center justify-center"
                        onClick={togglePlay}
                    >
                        {status === 'paused' && (
                            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                                <Play className="w-8 h-8 text-white ml-1" />
                            </div>
                        )}
                    </button>

                    {/* Bottom bar */}
                    <div className="absolute bottom-0 left-0 right-0 p-3 flex items-center justify-end gap-2">
                        <button
                            onClick={toggleMute}
                            className="p-2 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition"
                        >
                            {isMuted ? (
                                <VolumeX className="w-4 h-4 text-white" />
                            ) : (
                                <Volume2 className="w-4 h-4 text-white" />
                            )}
                        </button>
                        <button
                            onClick={toggleFullscreen}
                            className="p-2 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition"
                        >
                            {isFullscreen ? (
                                <Minimize className="w-4 h-4 text-white" />
                            ) : (
                                <Maximize className="w-4 h-4 text-white" />
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
