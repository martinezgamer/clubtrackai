import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'wouter';

interface VoiceCommand {
  phrases: string[];
  action: () => void;
  description: string;
  category: 'navigation' | 'action' | 'control';
}

interface UseVoiceCommandsProps {
  onQuickAction?: (action: string) => void;
  isEnabled?: boolean;
}

export function useVoiceCommands({ onQuickAction, isEnabled = true }: UseVoiceCommandsProps = {}) {
  const [isListening, setIsListening] = useState(false);
  const [lastCommand, setLastCommand] = useState<string>('');
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const [, setLocation] = useLocation();
  const commandTimeoutRef = useRef<NodeJS.Timeout>();

  // Voice commands configuration
  const commands: VoiceCommand[] = [
    // Navigation commands
    {
      phrases: ['go home', 'home page', 'main page', 'dashboard'],
      action: () => setLocation('/'),
      description: 'Navigate to home page',
      category: 'navigation'
    },
    {
      phrases: ['social media', 'social', 'go to social'],
      action: () => setLocation('/social-media'),
      description: 'Navigate to social media page',
      category: 'navigation'
    },
    {
      phrases: ['contacts', 'show contacts', 'contact list'],
      action: () => onQuickAction?.('all-contacts'),
      description: 'Show all contacts',
      category: 'action'
    },
    {
      phrases: ['calendar', 'schedule', 'events'],
      action: () => onQuickAction?.('today-schedule'),
      description: 'Show calendar/schedule',
      category: 'action'
    },
    {
      phrases: ['sales report', 'sales', 'revenue'],
      action: () => onQuickAction?.('sales-report'),
      description: 'Show sales report',
      category: 'action'
    },
    {
      phrases: ['create form', 'new form', 'form builder'],
      action: () => onQuickAction?.('create-form'),
      description: 'Create new form',
      category: 'action'
    },
    {
      phrases: ['new contact', 'add contact', 'create contact'],
      action: () => onQuickAction?.('create-new'),
      description: 'Create new contact',
      category: 'action'
    },
    // Control commands
    {
      phrases: ['stop listening', 'stop voice', 'voice off'],
      action: () => stopListening(),
      description: 'Stop voice commands',
      category: 'control'
    },
    {
      phrases: ['help', 'voice help', 'commands'],
      action: () => showVoiceHelp(),
      description: 'Show available voice commands',
      category: 'control'
    }
  ];

  const showVoiceHelp = useCallback(() => {
    const helpText = commands.map(cmd => 
      `"${cmd.phrases[0]}" - ${cmd.description}`
    ).join('\n');
    
    alert(`Available Voice Commands:\n\n${helpText}`);
  }, [commands]);

  const processCommand = useCallback((transcript: string) => {
    const normalizedTranscript = transcript.toLowerCase().trim();
    
    // Find matching command
    const matchedCommand = commands.find(command =>
      command.phrases.some(phrase => 
        normalizedTranscript.includes(phrase.toLowerCase())
      )
    );

    if (matchedCommand) {
      setLastCommand(normalizedTranscript);
      matchedCommand.action();
      
      // Provide audio feedback
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(`Executing ${matchedCommand.description}`);
        utterance.rate = 1.2;
        utterance.volume = 0.7;
        speechSynthesis.speak(utterance);
      }
      
      return true;
    }
    
    return false;
  }, [commands]);

  const startListening = useCallback(() => {
    if (!recognition || !isEnabled) return;
    
    try {
      setIsListening(true);
      recognition.start();
      
      // Auto-stop after 30 seconds of listening
      commandTimeoutRef.current = setTimeout(() => {
        stopListening();
      }, 30000);
      
    } catch (error) {
      console.error('Error starting voice recognition:', error);
      setIsListening(false);
    }
  }, [recognition, isEnabled]);

  const stopListening = useCallback(() => {
    if (recognition) {
      recognition.stop();
    }
    setIsListening(false);
    
    if (commandTimeoutRef.current) {
      clearTimeout(commandTimeoutRef.current);
    }
  }, [recognition]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Initialize speech recognition
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('Speech recognition not supported');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognitionInstance = new SpeechRecognition();
    
    recognitionInstance.continuous = false;
    recognitionInstance.interimResults = false;
    recognitionInstance.lang = 'en-US';
    recognitionInstance.maxAlternatives = 1;

    recognitionInstance.onstart = () => {
      console.log('Voice command recognition started');
    };

    recognitionInstance.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      console.log('Voice command heard:', transcript);
      
      const commandExecuted = processCommand(transcript);
      
      if (!commandExecuted) {
        // Provide feedback for unrecognized commands
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance('Command not recognized. Say "help" for available commands.');
          utterance.rate = 1.2;
          speechSynthesis.speak(utterance);
        }
      }
    };

    recognitionInstance.onerror = (event) => {
      console.error('Voice recognition error:', event.error);
      setIsListening(false);
      
      if (commandTimeoutRef.current) {
        clearTimeout(commandTimeoutRef.current);
      }
    };

    recognitionInstance.onend = () => {
      setIsListening(false);
      
      if (commandTimeoutRef.current) {
        clearTimeout(commandTimeoutRef.current);
      }
    };

    setRecognition(recognitionInstance);

    return () => {
      if (recognitionInstance) {
        recognitionInstance.stop();
      }
      if (commandTimeoutRef.current) {
        clearTimeout(commandTimeoutRef.current);
      }
    };
  }, [processCommand]);

  // Keyboard shortcuts for voice commands
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Ctrl/Cmd + Shift + V to toggle voice commands
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'V') {
        event.preventDefault();
        toggleListening();
      }
      
      // Escape to stop listening
      if (event.key === 'Escape' && isListening) {
        event.preventDefault();
        stopListening();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [toggleListening, isListening, stopListening]);

  const isSupported = recognition !== null;

  return {
    isListening,
    lastCommand,
    startListening,
    stopListening,
    toggleListening,
    isSupported,
    commands: commands.map(cmd => ({
      phrases: cmd.phrases,
      description: cmd.description,
      category: cmd.category
    }))
  };
}