import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SPELL_EFFECT_ICON_MANIFEST } from '../../../assets/iconManifest';
import { spellEffectIconWorklist } from '../../../assets/iconWorklist';
import { SPELL_LEXICON, type SpellLexiconId } from '../spellLexicon';

const sha = (value: Buffer | string) => createHash('sha256').update(value).digest('hex');
const requests = [1, 2, 3].flatMap((number) => (JSON.parse(readFileSync(
  `assets/jobs/spell-effect-icons-${number}-built-in.json`, 'utf8',
)) as { requests: Array<{
  id: string; assets: string[]; output: string; final: string; prompt: string;
  literal_subject: string; references: Array<{ file: string }>;
}> }).requests);
const provenance = JSON.parse(readFileSync(
  'assets/provenance/spell-effect-icon-generation.json', 'utf8',
)) as { selections: Array<{
  id: string; request_id: string; source: string; final: string; prompt: string;
  prompt_sha256: string; source_sha256: string; final_sha256: string;
}> };

describe('shared spell-effect icon production contract', () => {
  it('covers every lexicon subject once through manifest, worklist, jobs, and provenance', () => {
    const ids = Object.keys(SPELL_LEXICON) as SpellLexiconId[];
    expect(Object.keys(SPELL_EFFECT_ICON_MANIFEST)).toEqual(ids);
    expect(spellEffectIconWorklist().map((item) => item.id))
      .toEqual(ids.map((id) => `spell-effect-icon:${id}`));
    expect(requests).toHaveLength(30);
    expect(provenance.selections).toHaveLength(30);
    for (const id of ids) {
      const assetId = `spell-effect-icon:${id}`;
      const request = requests.find((entry) => entry.assets[0] === assetId);
      const selection = provenance.selections.find((entry) => entry.id === assetId);
      expect(request?.literal_subject, id).toBe(SPELL_LEXICON[id].visualSubject);
      expect(request?.prompt, id).toContain(SPELL_LEXICON[id].visualSubject);
      expect(request?.references, id).toHaveLength(3);
      expect(selection?.request_id, id).toBe(request?.id);
      expect(selection?.source, id).toBe(request?.output);
      expect(selection?.final, id).toBe(request?.final);
    }
  });

  it('retains exact unique prompt/source/final hashes', () => {
    expect(new Set(provenance.selections.map((entry) => entry.prompt_sha256)).size).toBe(30);
    expect(new Set(provenance.selections.map((entry) => entry.source_sha256)).size).toBe(30);
    expect(new Set(provenance.selections.map((entry) => entry.final_sha256)).size).toBe(30);
    for (const entry of provenance.selections) {
      expect(sha(entry.prompt), entry.id).toBe(entry.prompt_sha256);
      expect(sha(readFileSync(entry.source)), entry.id).toBe(entry.source_sha256);
      expect(sha(readFileSync(entry.final)), entry.id).toBe(entry.final_sha256);
    }
  });
});
