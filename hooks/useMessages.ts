// Hook für Messages mit Realtime-Updates

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { Message, Workspace } from '../types';

interface UseMessagesProps {
  agentId: string;
  workspaceId: string;
  userId: string;
}

interface UseMessagesReturn {
  messages: Message[];
  workspace: Workspace | null;
  loading: boolean;
  error: string | null;
  hasUnreadMessages: boolean;
  isAtBottom: boolean;
  setIsAtBottom: (value: boolean) => void;
  sendMessage: (text: string) => Promise<void>;
  updateReadStatus: () => Promise<void>;
  setError: (error: string | null) => void;
}

export const useMessages = ({ agentId, workspaceId, userId }: UseMessagesProps): UseMessagesReturn => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const lastReadAtRef = useRef<string | null>(null);

  // Lesestatus aktualisieren
  const updateReadStatus = useCallback(async () => {
    const { error: updateError } = await supabase
      .from('message_read_status')
      .upsert({
        user_id: userId,
        agent_id: agentId,
        workspace_id: workspaceId,
        last_read_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,agent_id,workspace_id'
      });

    if (updateError) {
      console.error('Error updating read status:', updateError);
    }
    
    lastReadAtRef.current = new Date().toISOString();
    setHasUnreadMessages(false);
  }, [userId, agentId, workspaceId]);

  // Workspace laden
  useEffect(() => {
    const fetchWorkspace = async () => {
      const { data, error: wsError } = await supabase
        .from('workspaces')
        .select('*')
        .eq('id', workspaceId)
        .single();

      if (wsError) {
        console.error('Error fetching workspace:', wsError);
      } else {
        setWorkspace(data);
      }
    };

    fetchWorkspace();
  }, [workspaceId]);

  // Messages laden
  useEffect(() => {
    const fetchMessages = async () => {
      const { data, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('agent_id', agentId)
        .order('created_at', { ascending: true });

      if (msgError) {
        console.error('Error fetching messages:', msgError);
      } else {
        setMessages(data || []);
      }
    };

    fetchMessages();
  }, [agentId, workspaceId]);

  // Lesestatus laden
  useEffect(() => {
    const loadReadStatus = async () => {
      const { data } = await supabase
        .from('message_read_status')
        .select('last_read_at')
        .eq('user_id', userId)
        .eq('agent_id', agentId)
        .eq('workspace_id', workspaceId)
        .single();

      lastReadAtRef.current = data?.last_read_at || null;
    };

    loadReadStatus();
  }, [userId, agentId, workspaceId]);

  // Realtime Subscription
  useEffect(() => {
    const subscription = supabase
      .channel(`messages:${workspaceId}:${agentId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'messages'
      }, (payload) => {
        const newMessage = payload.new as Message;
        if (newMessage.workspace_id !== workspaceId) return;
        if (newMessage.agent_id !== agentId) return;
        
        if (payload.eventType === 'INSERT') {
          setMessages(prev => {
            if (prev.find(m => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
          
          if (newMessage.role === 'assistant' && !isAtBottom) {
            setHasUnreadMessages(true);
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [agentId, workspaceId, isAtBottom]);

  // Lesestatus aktualisieren wenn am Ende
  useEffect(() => {
    if (isAtBottom && messages.length > 0) {
      updateReadStatus();
    }
  }, [isAtBottom, messages.length, updateReadStatus]);

  // Nachricht senden
  const sendMessage = async (text: string) => {
    if (!workspace?.webhook_url) {
      throw new Error('Keine Webhook URL konfiguriert');
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        text,
        user_id: userId,
        agent_id: agentId,
        agent_workflow_id: null,
        workspace_id: workspaceId
      };

      const response = await fetch(workspace.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        let errorMessage = `Fehler ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.message) errorMessage = errorData.message;
        } catch {
          // JSON parsing failed
        }
        throw new Error(errorMessage);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unbekannter Fehler';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    messages,
    workspace,
    loading,
    error,
    hasUnreadMessages,
    isAtBottom,
    setIsAtBottom,
    sendMessage,
    updateReadStatus,
    setError
  };
};
