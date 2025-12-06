// Chat Messages Anzeige

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Agent, Message } from '../../types';

interface ChatMessagesProps {
  messages: Message[];
  agent: Agent;
  loading: boolean;
}

export const ChatMessages: React.FC<ChatMessagesProps> = ({ messages, agent, loading }) => {
  if (messages.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center px-4">
        <div className="relative mb-4">
          <img 
            src={agent.thumbnail} 
            alt={agent.name} 
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-gray-100"
          />
          <span className="absolute bottom-1 right-1 w-3 h-3 sm:w-4 sm:h-4 bg-green-500 border-2 border-white rounded-full"></span>
        </div>
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">{agent.name}</h3>
        {agent.user_instruction && (
          <p className="text-sm text-gray-500 max-w-md">{agent.user_instruction}</p>
        )}
      </div>
    );
  }

  return (
    <>
      {messages.map((msg) => (
        <div 
          key={msg.id} 
          className={`flex ${msg.role === 'user' ? 'justify-end' : msg.role === 'system' ? 'justify-center' : 'justify-start'}`}
        >
          {msg.role === 'system' ? (
            <div className="text-xs text-gray-400 italic py-1">
              {msg.content}
            </div>
          ) : (
            <div 
              className={`
                max-w-[85%] sm:max-w-[70%] px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl text-sm leading-relaxed
                ${msg.role === 'user' 
                  ? 'bg-gray-900 text-white rounded-tr-sm' 
                  : 'bg-gray-100 text-gray-900 rounded-tl-sm'
                }
              `}
            >
              <div className={`prose prose-sm max-w-none ${msg.role === 'user' ? 'prose-invert' : ''}`}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {msg.content}
                </ReactMarkdown>
              </div>
            </div>
          )}
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
    </>
  );
};
