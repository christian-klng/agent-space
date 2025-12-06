# Agent Space

React-App für die Kommunikation mit KI-Agenten. Jeder Agent hat einen Chat und kann Dokumente verwalten.

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Backend**: Supabase (Auth, Database, Realtime)
- **Deploy**: GitHub → Railway (automatisch)

## Projektstruktur

```
agent-space/
├── App.tsx                      # Haupt-App mit Routing
├── index.tsx                    # Entry Point
├── types.ts                     # TypeScript Interfaces
│
├── components/
│   ├── Auth.tsx                 # Login/Registrierung
│   ├── AgentGrid.tsx            # Agent-Übersicht
│   ├── SetupScreen.tsx          # Ersteinrichtung
│   ├── WorkspaceSetup.tsx       # Workspace-Verwaltung
│   ├── StyleGuide.tsx           # Design-System Dokumentation
│   │
│   ├── Chat.tsx                 # Re-Export für Abwärtskompatibilität
│   └── Chat/                    # Chat-Modul (refactored)
│       ├── index.tsx            # Hauptkomponente, Layout, State-Orchestrierung
│       ├── ChatMessages.tsx     # Nachrichten-Anzeige mit Markdown
│       ├── ChatInput.tsx        # Eingabefeld mit Auto-Resize
│       ├── DocumentList.tsx     # Dokumenten-Sidebar
│       ├── TextDocument.tsx     # Text-Dokumente mit Diff-Ansicht
│       ├── TableDocument.tsx    # Tabellen mit Inline-Editing
│       └── WebpageDocument.tsx  # Webseiten-Dokumente
│
├── hooks/
│   ├── useMessages.ts           # Messages laden, senden, Realtime
│   └── useDocuments.ts          # Dokumente laden, Realtime für alle Typen
│
├── utils/
│   ├── dateUtils.ts             # Datumsformatierung (relativ, voll, kurz)
│   └── exportUtils.ts           # XLSX/DOCX Export-Funktionen
│
├── services/
│   ├── supabaseClient.ts        # Supabase-Initialisierung
│   └── geminiService.ts         # Google Gemini API (falls genutzt)
│
└── public/
    ├── favicon.png
    ├── logo.png
    └── og-image.png
```

## Datenbank (Supabase)

### Tabellen

| Tabelle | Beschreibung |
|---------|--------------|
| `users` | Benutzer-Profile |
| `workspaces` | Arbeitsbereiche mit webhook_url |
| `agents` | KI-Agenten mit Konfiguration |
| `messages` | Chat-Nachrichten (user/assistant/system) |
| `documents` | Dokument-Definitionen (text/table/webpage) |
| `contents` | Text-Dokument-Versionen |
| `table_entries` | Tabellen-Zeilen mit Versionierung |
| `webpages` | Webseiten-Snapshots |
| `message_read_status` | Lesestatus pro User/Agent |

### Realtime

Aktiviert für: `messages`, `contents`, `table_entries`, `webpages`

## Dokument-Typen

### Text (`type: 'text'`)
- Markdown-Inhalt in `contents`-Tabelle
- Versionierung mit Diff-Ansicht
- Export als DOCX

### Tabelle (`type: 'table'`)
- Schema in `documents.table_schema`
- Daten in `table_entries` (row_id, data, version, position)
- Inline-Editing mit Tab-Navigation
- Export als XLSX

### Webseite (`type: 'webpage'`)
- URL, Titel, Thumbnail, Beschreibung
- Ausgehende Links
- Versionierung

## Lokale Entwicklung

```bash
npm install
npm run dev
```

## Dependencies (wichtig)

```json
{
  "xlsx": "^0.18.5",
  "docx": "^8.5.0",
  "file-saver": "^2.0.5",
  "diff": "^5.1.0",
  "react-markdown": "^9.0.1",
  "remark-gfm": "^4.0.0"
}
```

## Code-Konventionen

- **UI-Sprache**: Deutsch
- **Dateigröße**: Max. 400-500 Zeilen pro Datei
- **State**: Hooks für komplexe Logik auslagern
- **Komponenten**: Eine Verantwortung pro Datei
- **SQL**: Einfache Statements, keine DO $$ Blöcke
