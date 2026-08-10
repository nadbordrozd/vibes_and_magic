import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import './ui/styles/base.css';
import './ui/styles/game.css';
import './ui/styles/castle.css';
import './ui/styles/combat.css';
import './ui/styles/map-editor.css';
import { preloadAssetManifest } from './ui/assets';
import { TerrainShowcase } from './ui/components/TerrainShowcase';
import { AdventureVisualShowcase } from './ui/components/AdventureVisualShowcase';
import { ContentIconShowcase } from './ui/components/ContentIconShowcase';

preloadAssetManifest();

const standaloneTerrainShowcase = new URLSearchParams(location.search).has('terrain-showcase');
const standaloneAdventureShowcase = new URLSearchParams(location.search).has('adventure-showcase');
const standaloneContentIconShowcase = new URLSearchParams(location.search).has('content-icons');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {standaloneContentIconShowcase ? <ContentIconShowcase />
      : standaloneAdventureShowcase ? <AdventureVisualShowcase />
      : standaloneTerrainShowcase ? <TerrainShowcase /> : <App />}
  </StrictMode>,
);
