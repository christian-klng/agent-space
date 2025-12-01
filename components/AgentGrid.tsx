import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Agent, Document } from '../types';
import { Sparkles, AlertCircle, FileText } from 'lucide-react';

interface AgentGridProps {
  onSelectAgent: (agent: Agent) => void;
}

export const AgentGrid: React.FC<AgentGridProps> = ({ onSelectAgent }) => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: agentsData, error: agentsError } = await supabase
        .from('agents')
        .select('*');

      if (agentsError) {
        console.error('Error fetching agents:', agentsError);
        setError(agentsError.message);
        setLoading(false);
        return;
      }

      const { data: docsData, error: docsError } = await supabase
        .from('documents')
        .select('*');

      if (docsError) {
        console.error('Error fetching documents:', docsError);
      }

      setAgents(agentsData || []);
      setDocuments(docsData || []);
      setLoading(false);
    };

    fetchData();
  }, []);

  const getDocumentsForAgent = (agentId: string): Document[] => {
    return documents.filter(doc => doc.agent_ids.includes(agentId));
  };

  const seedAgents = async () => {
    const demoAgents = [
      {
        name: "Sofia",
        role: "Creative Writer",
        thumbnail: "https://picsum.photos/200/200?random=1",
        user_instruction: "Ich helfe dir beim Schreiben von Geschichten, Gedichten und kreativen Texten."
      },
      {
        name: "Marcus",
        role: "Technical Advisor",
        thumbnail: "https://picsum.photos/200/200?random=2",
        user_instruction: "Ich unterstütze dich bei technischen Fragen und Software-Architektur."
      },
      {
        name: "Elena",
        role: "Life Coach",
        thumbnail: "https://picsum.photos/200/200?random=3",
        user_instruction: "Ich begleite dich auf deinem Weg zu mehr Klarheit und persönlichem Wachstum."
      },
      {
        name: "Kai",
        role: "Product Manager",
        thumbnail: "https://picsum.photos/200/200?random=4",
        user_instruction: "Ich helfe dir bei Produktstrategie, Priorisierung und Nutzerfokus."
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
      <div className="p-4 sm:p-8 max-w-6xl mx-auto">
        <div className="text-center py-12 sm:py-20 border border-dashed border-red-200 rounded-xl bg-red-50">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
          <h3 className="text-red-900 font-medium mb-1">Fehler beim Laden</h3>
          <p className="text-red-600 text-sm mb-2">{error}</p>
          <p className="text-red-500 text-xs">Überprüfe die RLS-Policies in Supabase.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 tracking-tight mb-1 sm:mb-2">
          Wähle einen Agenten
        </h1>
        <p className="text-gray-500 text-sm">
          Wähle einen spezialisierten KI-Assistenten für deine Unterhaltung.
        </p>
      </div>

      {agents.length === 0 ? (
        <div className="text-center py-12 sm:py-20 border border-dashed border-gray-200 rounded-xl bg-gray-50">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {agents.map((agent) => {
            const agentDocs = getDocumentsForAgent(agent.id);
            
            return (
              <div
                key={agent.id}
                onClick={() => onSelectAgent(agent)}
                className="group relative bg-white border border-gray-200 rounded-xl p-4 sm:p-5 hover:border-gray-300 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all cursor-pointer active:scale-[0.98]"
              >
                <div className="flex items-start justify-between mb-3 sm:mb-4">
                  {/* Thumbnail mit Tooltip */}
                  <div className="relative group/tooltip">
                    <img
                      src={agent.thumbnail}
                      alt={agent.name}
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border border-gray-100 group-hover:scale-105 transition-transform"
                    />
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 border-2 border-white rounded-full"></span>
                    
                    {/* Tooltip - nur auf Desktop */}
                    {agent.user_instruction && (
                      <div className="hidden sm:block absolute left-0 top-full mt-2 z-20 w-64 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200">
                        {agent.user_instruction}
                        <div className="absolute -top-1 left-4 w-2 h-2 bg-gray-900 rotate-45"></div>
                      </div>
                    )}
                  </div>
                  
                  {/* Dokumente-Icons */}
                  {agentDocs.length > 0 && (
                    <div className="flex items-center gap-1">
                      {agentDocs.slice(0, 3).map((doc) => (
                        <div
                          key={doc.id}
                          title={doc.name}
                          className="p-1 sm:p-1.5 bg-gray-50 rounded-md text-gray-400"
                        >
                          <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                        </div>
                      ))}
                      {agentDocs.length > 3 && (
                        <span className="text-xs text-gray-400 ml-1">
                          +{agentDocs.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-0.5 sm:mb-1">{agent.name}</h3>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{agent.role}</p>
                  
                  {/* User Instruction auf mobil als Subtext */}
                  {agent.user_instruction && (
                    <p className="sm:hidden text-xs text-gray-400 mt-2 line-clamp-2">
                      {agent.user_instruction}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
