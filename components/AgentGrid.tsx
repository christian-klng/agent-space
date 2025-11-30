import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Agent } from '../types';
import { MessageSquare, Sparkles, AlertCircle } from 'lucide-react';

interface AgentGridProps {
  onSelectAgent: (agent: Agent) => void;
}

export const AgentGrid: React.FC<AgentGridProps> = ({ onSelectAgent }) => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAgents = async () => {
      const { data, error } = await supabase
        .from('agents')
        .select('*');

      if (error) {
        console.error('Error fetching agents:', error);
        setError(error.message);
      } else if (data) {
        setAgents(data);
      }
      setLoading(false);
    };

    fetchAgents();
  }, []);

  const seedAgents = async () => {
    const demoAgents = [
      {
        name: "Sofia",
        role: "Creative Writer",
        thumbnail: "https://picsum.photos/200/200?random=1",
        system_instruction: "You are Sofia, a creative writer who loves metaphors and vivid imagery. Help the user write stories, poems, or copy."
      },
      {
        name: "Marcus",
        role: "Technical Advisor",
        thumbnail: "https://picsum.photos/200/200?random=2",
        system_instruction: "You are Marcus, a senior software engineer and technical architect. Provide concise, accurate, and scalable technical solutions."
      },
      {
        name: "Elena",
        role: "Life Coach",
        thumbnail: "https://picsum.photos/200/200?random=3",
        system_instruction: "You are Elena, an empathetic life coach. Listen actively and ask guiding questions to help the user find clarity."
      },
      {
        name: "Kai",
        role: "Product Manager",
        thumbnail: "https://picsum.photos/200/200?random=4",
        system_instruction: "You are Kai, a product manager focused on user value, prioritization, and business strategy. Critique ideas constructively."
      }
    ];
    
    const { error } = await supabase.from('agents').insert(demoAgents);
    if (error) {
      console.error('Error seeding agents:', error);
      setError(error.message);
    } else {
      window.location.reload();
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <div className="text-center py-20 border border-dashed border-red-200 rounded-xl bg-red-50">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
          <h3 className="text-red-900 font-medium mb-1">Fehler beim Laden</h3>
          <p className="text-red-600 text-sm mb-2">{error}</p>
          <p className="text-red-500 text-xs">Überprüfe die RLS-Policies in Supabase.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight mb-2">Wähle einen Agenten</h1>
        <p className="text-gray-500 text-sm">Wähle einen spezialisierten KI-Assistenten für deine Unterhaltung.</p>
      </div>

      {agents.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-gray-200 rounded-xl bg-gray-50">
          <Sparkles className="w-8 h-8 text-gray-400 mx-auto mb-3" />
          <h3 className="text-gray-900 font-medium mb-1">Keine Agenten gefunden</h3>
          <p className="text-gray-500 text-sm mb-4">Die Datenbank-Tabelle scheint leer zu sein.</p>
          <button 
            onClick={seedAgents}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            Demo-Agenten erstellen
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent) => (
            <div
              key={agent.id}
              onClick={() => onSelectAgent(agent)}
              className="group relative bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <img
                  src={agent.thumbnail}
                  alt={agent.name}
                  className="w-12 h-12 rounded-full object-cover border border-gray-100 group-hover:scale-105 transition-transform"
                />
                <div className="p-2 bg-gray-50 rounded-lg text-gray-400 group-hover:text-gray-900 group-hover:bg-gray-100 transition-colors">
                  <MessageSquare className="w-4 h-4" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">{agent.name}</h3>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{agent.role}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
