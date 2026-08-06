import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import './ui/styles/base.css';
import './ui/styles/game.css';
import './ui/styles/castle.css';
import './ui/styles/combat.css';
import { preloadAssetManifest } from './ui/assets';
import { TerrainShowcase } from './ui/components/TerrainShowcase';

preloadAssetManifest();

const standaloneTerrainShowcase = new URLSearchParams(location.search).has('terrain-showcase');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {standaloneTerrainShowcase ? <TerrainShowcase /> : <App />}
  </StrictMode>,
);
