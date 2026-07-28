import { createContext, useContext, ReactNode } from 'react';

type PlaybackState = 'idle' | 'playing' | 'paused';

export interface AudioContextType {
    state: PlaybackState;
    voice: SpeechSynthesisVoice | null;
    voiceOptions: SpeechSynthesisVoice[];
    rate: number;
    onVoiceChange: (voiceName: string) => void;
    onRateChange: (rate: number) => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children, value }: { children: ReactNode; value: AudioContextType }) {
    return (
        <AudioContext.Provider value={value}>
            {children}
        </AudioContext.Provider>
    );
}

export function useAudio() {
    const context = useContext(AudioContext);
    if (!context) {
        throw new Error('useAudio must be used within AudioProvider');
    }
    return context;
}
