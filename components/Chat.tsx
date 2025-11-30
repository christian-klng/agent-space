import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { generateAgentResponse } from '../services/geminiService';
import { Agent, Message } from '../types';
import { Send, ArrowLeft, Loader2 } from 'lucide-react';

interface ChatProps {
  agent: Agent;
  userId: string;
  onBack: () => void;
}

export const Chat: React.FC<ChatProps> = ({ agent, userId, onBack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();
    const subscription = supabase
      .channel('public:messages')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `user_id=eq.${userId}` // Basic filtering, refine for agent specific if possible via RLS or client filter
      }, (payload) => {
        const newMessage = payload.new as Message;
        if (newMessage.agent_id === agent.id) {
            setMessages(prev => {
                if (prev.find(m => m.id === newMessage.id)) return prev;
                return [...prev, newMessage];
            });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent.id, userId]);

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('user_id', userId)
      .eq('agent_id', agent.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
    } else {
      setMessages(data || []);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!inputValue.trim() || loading) return;

    const userContent = inputValue.trim();
    setInputValue('');
    setLoading(true);

    // Optimistic UI update (optional, but good for UX)
    // We'll wait for DB confirmation to keep it simple and consistent with subscription

    try {
      // 1. Save User Message
      const { data: userData, error: userError } = await supabase
        .from('messages')
        .insert({
          user_id: userId,
          agent_id: agent.id,
          content: userContent,
          role: 'user'
        })
        .select()
        .single();

      if (userError) throw userError;

      // 2. Generate AI Response
      // We pass the current messages state (plus the new one if we wanted to be precise, 
      // but userData is now in DB, we can just pass current state + new text)
      const responseText = await generateAgentResponse(
        messages, 
        userContent,
        agent.system_instruction
      );

      // 3. Save AI Message
      const { error: aiError } = await supabase
        .from('messages')
        .insert({
          user_id: userId,
          agent_id: agent.id,
          content: responseText,
          role: 'model'
        });

      if (aiError) throw aiError;

    } catch (err) {
      console.error('Failed to send message:', err);
      // Ideally show a toast error here
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <button 
          onClick={onBack}
          className="p-2 -ml-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3">
          <img 
            src={agent.thumbnail} 
            alt={agent.name} 
            className="w-10 h-10 rounded-full object-cover border border-gray-200"
          />
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{agent.name}</h3>
            <p className="text-xs text-gray-500">{agent.role}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2">
            <p className="text-sm">Start a conversation with {agent.name}</p>
          </div>
        )}
        
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`
                max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed
                ${msg.role === 'user' 
                  ? 'bg-gray-900 text-white rounded-tr-sm' 
                  : 'bg-gray-100 text-gray-900 rounded-tl-sm'
                }
              `}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
           <div className="flex justify-start">
             <div className="bg-gray-50 border border-gray-100 px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
             </div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-gray-100">
        <div className="max-w-4xl mx-auto relative flex items-center">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={`Message ${agent.name}...`}
            className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-300 focus:bg-white transition-all placeholder:text-gray-400"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || loading}
            className="absolute right-2 p-1.5 bg-white border border-gray-200 rounded-lg text-gray-400 hover:text-gray-900 hover:border-gray-300 disabled:opacity-50 disabled:hover:text-gray-400 transition-all shadow-sm"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};
