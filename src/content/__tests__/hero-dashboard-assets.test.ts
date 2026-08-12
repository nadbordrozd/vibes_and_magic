import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { HEROES } from '../heroes';
import {
  HERO_DASHBOARD_MANIFEST, heroPrimaryStatAsset,
} from '../../../assets/heroDashboardManifest';
import { heroDashboardWorklist } from '../../../assets/heroDashboardWorklist';
import {
  HERO_PRIMARY_STAT_VISUAL_SUBJECTS, HERO_SPECIALTY_VISUAL_SUBJECTS,
  HERO_VITAL_VISUAL_SUBJECTS,
} from '../../../assets/heroDashboardSubjects';

const sha = (value: Buffer | string) => createHash('sha256').update(value).digest('hex');
const jobs = Array.from({ length: 8 }, (_, index) => JSON.parse(readFileSync(
  `assets/jobs/hero-dashboard-${index + 1}-built-in.json`, 'utf8',
)) as { requests: Array<{
  id: string; assets: string[]; output: string; final: string; prompt: string;
  literal_subject: string; candidates: number; built_in_output: string;
}> }).flatMap((job) => job.requests);
const provenance = JSON.parse(readFileSync(
  'assets/provenance/hero-dashboard-generation.json', 'utf8',
)) as { selections: Array<{
  id: string; request_id: string; accepted: boolean; built_in_output: string;
  discarded_outputs: Array<{ source: string; reason: string; source_sha256: string }>;
  source: string; final: string; prompt: string; prompt_sha256: string;
  source_sha256: string; final_sha256: string; final_dimensions: [number, number];
}> };
const selectionFile = JSON.parse(readFileSync(
  'assets/heroDashboardSelections.json', 'utf8',
)) as { entries: Array<{ id: string; accepted: boolean; discarded_outputs: unknown[] }> };

describe('hero dashboard asset catalog', () => {
  it('derives the exact 79 new IDs from 36 heroes and 36 distinct specialties', () => {
    const heroes = Object.values(HEROES);
    const specialtyIds = heroes.map((hero) => hero.specialty.id);
    expect(heroes).toHaveLength(36);
    expect(new Set(specialtyIds).size).toBe(36);
    const expected = [
      ...heroes.map((hero) => `hero-portrait:${hero.id}`),
      ...specialtyIds.map((id) => `hero-specialty:${id}`),
      'hero-primary-stat:attack', 'hero-primary-stat:defense', 'hero-primary-stat:knowledge',
      'hero-vital:experience', 'hero-vital:movement', 'hero-vital:mana', 'hero-vital:luck',
    ];
    expect(heroDashboardWorklist().map((item) => item.id)).toEqual(expected);
    expect(Object.keys(HERO_DASHBOARD_MANIFEST)).toEqual(expected);
    expect(expected).toHaveLength(79);
  });

  it('couples every specialty and fixed icon to an exhaustive literal physical subject', () => {
    expect(Object.keys(HERO_SPECIALTY_VISUAL_SUBJECTS))
      .toEqual(Object.values(HEROES).map((hero) => hero.specialty.id));
    expect(Object.keys(HERO_PRIMARY_STAT_VISUAL_SUBJECTS)).toEqual(['attack', 'defense', 'knowledge']);
    expect(Object.keys(HERO_VITAL_VISUAL_SUBJECTS)).toEqual(['experience', 'movement', 'mana', 'luck']);
    for (const hero of Object.values(HEROES)) {
      const request = jobs.find((entry) => entry.assets[0] === `hero-portrait:${hero.id}`);
      expect(request?.literal_subject, hero.id).toContain(hero.name);
      expect(request?.literal_subject, hero.id).toContain(hero.story);
      expect(request?.literal_subject, hero.id).toContain(hero.specialty.description);
    }
  });

  it('records one distinct provider call, source, path, content hash, and accepted selection each', () => {
    expect(jobs).toHaveLength(79);
    expect(provenance.selections).toHaveLength(79);
    expect(selectionFile.entries).toHaveLength(79);
    for (const set of [jobs.map((entry) => entry.id), jobs.map((entry) => entry.built_in_output),
      jobs.map((entry) => entry.output), jobs.map((entry) => entry.final),
      provenance.selections.map((entry) => entry.source_sha256),
      provenance.selections.map((entry) => entry.final_sha256)]) {
      expect(new Set(set).size).toBe(79);
    }
    for (const entry of provenance.selections) {
      const request = jobs.find((candidate) => candidate.id === entry.request_id);
      expect(request?.candidates, entry.id).toBe(1);
      expect(request?.assets, entry.id).toEqual([entry.id]);
      expect(entry.accepted, entry.id).toBe(true);
      expect(entry.discarded_outputs, entry.id).toEqual([]);
      expect(sha(entry.prompt), entry.id).toBe(entry.prompt_sha256);
      expect(sha(readFileSync(entry.source)), entry.id).toBe(entry.source_sha256);
      expect(sha(readFileSync(entry.final)), entry.id).toBe(entry.final_sha256);
      expect(entry.final_dimensions, entry.id).toEqual(
        entry.id.startsWith('hero-portrait:') ? [96, 96] : [32, 32],
      );
    }
  });

  it('retains every rejected attempt or explicitly records that no retry was needed', () => {
    for (const entry of selectionFile.entries) {
      expect(entry.accepted, entry.id).toBe(true);
      expect(Array.isArray(entry.discarded_outputs), entry.id).toBe(true);
    }
    for (const entry of provenance.selections) for (const rejected of entry.discarded_outputs) {
      expect(rejected.reason).toMatch(/^Rejected:/);
      expect(sha(readFileSync(rejected.source))).toBe(rejected.source_sha256);
    }
  });

  it('reuses Spell Power and keeps the required shared renderer fallback-free', () => {
    expect(heroPrimaryStatAsset('spellPower').file).toBe('assets/icons/effects/spell-power.png');
    expect(Object.keys(HERO_DASHBOARD_MANIFEST)).not.toContain('hero-primary-stat:spellPower');
    const renderer = readFileSync('src/ui/components/HeroDashboardAssets.tsx', 'utf8');
    expect(renderer).toContain('heroPrimaryStatAsset(stat)');
    expect(renderer).not.toMatch(/fallbackSrc|fallbackIcon|onError/);
  });
});
