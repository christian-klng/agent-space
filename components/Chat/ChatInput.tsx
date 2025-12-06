// Chat Input Komponente

import React, { useRef } from 'react';
import { Send, Loader2 } from 'lucide-react';

interface ChatInputProps {
  agentName: string;
  loading: boolean;
  onSend: (text: string) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({ agentName, loading, onSend }) => {
  const [inputValue, setInputValue] = React.useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (!inputValue.trim() || loading) return;
    
    const text = inputValue.trim();
    setInputValue('');
    
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    
    onSend(text);
  };

  return (
    <div className="p-3 sm:p-4 bg-white border-t border-gray-100 safe-area-bottom">
      <div className="max-w-4xl mx-auto relative flex items-end">
        <textarea
          ref={textareaRef}
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={`Nachricht an ${agentName}...`}
          className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-300 focus:bg-white transition-all placeholder:text-gray-400 resize-none overflow-y-auto"
          disabled={loading}
          rows={1}
          style={{ maxHeight: '200px' }}
        />
        <button
          onClick={handleSend}
          disabled={!inputValue.trim() || loading}
          className="absolute right-2 bottom-2 p-1.5 bg-white border border-gray-200 rounded-lg text-gray-400 hover:text-gray-900 hover:border-gray-300 disabled:opacity-50 disabled:hover:text-gray-400 transition-all shadow-sm"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};
