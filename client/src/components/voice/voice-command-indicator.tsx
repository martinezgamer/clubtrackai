import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  ChevronDown, 
  ChevronUp,
  Command,
  HelpCircle
} from 'lucide-react';
import { useVoiceCommands } from '@/hooks/use-voice-commands';

interface VoiceCommandIndicatorProps {
  onQuickAction?: (action: string) => void;
  className?: string;
}

export function VoiceCommandIndicator({ onQuickAction, className }: VoiceCommandIndicatorProps) {
  const [showHelp, setShowHelp] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  
  const {
    isListening,
    lastCommand,
    startListening,
    stopListening,
    toggleListening,
    isSupported,
    commands
  } = useVoiceCommands({ onQuickAction });

  // Group commands by category - memoize to prevent infinite updates
  const commandsByCategory = useMemo(() => {
    return commands.reduce((acc, command) => {
      if (!acc[command.category]) {
        acc[command.category] = [];
      }
      acc[command.category].push(command);
      return acc;
    }, {} as Record<string, typeof commands>);
  }, [commands]);

  const toggleAudioFeedback = () => {
    setAudioEnabled(!audioEnabled);
    if (!audioEnabled) {
      // Test audio feedback
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance('Audio feedback enabled');
        utterance.rate = 1.2;
        utterance.volume = 0.7;
        speechSynthesis.speak(utterance);
      }
    }
  };

  // Disable audio feedback globally when turned off
  useEffect(() => {
    if (!audioEnabled && 'speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
  }, [audioEnabled]);

  if (!isSupported) {
    return (
      <div className={`p-2 bg-yellow-900/20 border border-yellow-700 rounded-lg ${className}`}>
        <div className="flex items-center space-x-2 text-yellow-400">
          <MicOff className="w-4 h-4" />
          <span className="text-sm">Voice commands not supported in this browser</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Voice Control Panel - Mobile optimized */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader className="pb-2 md:pb-3 p-3 md:p-6">
          <CardTitle className="flex items-center justify-between text-white">
            <div className="flex items-center space-x-2">
              <Command className="w-4 h-4 md:w-5 md:h-5 text-blue-400" />
              <span className="text-sm md:text-lg">Voice Commands</span>
            </div>
            <div className="flex items-center space-x-1 md:space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleAudioFeedback}
                className={`${audioEnabled ? 'text-green-400' : 'text-gray-400'} hover:text-white p-1 md:p-2`}
              >
                {audioEnabled ? <Volume2 className="w-3 h-3 md:w-4 md:h-4" /> : <VolumeX className="w-3 h-3 md:w-4 md:h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHelp(!showHelp)}
                className="text-gray-400 hover:text-white p-1 md:p-2"
              >
                <HelpCircle className="w-3 h-3 md:w-4 md:h-4" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Main Control Button */}
          <div className="flex items-center justify-between">
            <Button
              onClick={toggleListening}
              className={`flex-1 mr-3 ${
                isListening 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isListening ? (
                <>
                  <MicOff className="w-4 h-4 mr-2" />
                  Stop Listening
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 mr-2" />
                  Start Voice Commands
                </>
              )}
            </Button>
            
            {isListening && (
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-400 rounded-full animate-pulse" />
                <span className="text-sm text-red-400 font-medium">Listening...</span>
              </div>
            )}
          </div>

          {/* Last Command Display */}
          {lastCommand && (
            <div className="bg-gray-700 p-2 rounded text-sm">
              <span className="text-gray-400">Last command: </span>
              <span className="text-white">{lastCommand}</span>
            </div>
          )}

          {/* Keyboard Shortcut */}
          <div className="text-xs text-gray-400 flex items-center space-x-1">
            <Badge variant="outline" className="text-xs">
              Ctrl+Shift+V
            </Badge>
            <span>to toggle • </span>
            <Badge variant="outline" className="text-xs">
              Esc
            </Badge>
            <span>to stop</span>
          </div>
        </CardContent>
      </Card>

      {/* Help Panel */}
      <div className="space-y-2">
        <Button 
          variant="outline" 
          className="w-full text-gray-300 border-gray-600 hover:bg-gray-700"
          onClick={() => setShowHelp(!showHelp)}
        >
          <span className="flex-1 text-left">Available Voice Commands</span>
          {showHelp ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
        
        {showHelp && (
          <div className="space-y-3 mt-2 animate-fadeIn">
            {Object.entries(commandsByCategory).map(([category, categoryCommands]) => (
              <Card key={category} className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-blue-400 capitalize">{category} Commands</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {categoryCommands.map((command, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <div className="flex-1">
                        <div className="flex flex-wrap gap-1 mb-1">
                          {command.phrases.map((phrase, phraseIndex) => (
                            <Badge key={phraseIndex} variant="secondary" className="text-xs">
                              "{phrase}"
                            </Badge>
                          ))}
                        </div>
                        <p className="text-xs text-gray-400">{command.description}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Status Indicator */}
      {isListening && (
        <div className="fixed bottom-4 right-4 bg-red-600 text-white p-3 rounded-full shadow-lg z-50 animate-pulse">
          <Mic className="w-6 h-6" />
        </div>
      )}
    </div>
  );
}