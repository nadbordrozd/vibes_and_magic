import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SPELL_EFFECT_ICON_MANIFEST } from '../../../assets/iconManifest';
import { spellEffectIconWorklist } from '../../../assets/iconWorklist';
import { SPELL_LEXICON, type SpellLexiconId } from '../spellLexicon';

const sha = (value: Buffer | string) => createHash('sha256').update(value).digest('hex');
const legacyRequests = [1, 2, 3].flatMap((number) => (JSON.parse(readFileSync(
  `assets/jobs/spell-effect-icons-${number}-built-in.json`, 'utf8',
)) as { requests: Array<{
  id: string; assets: string[]; output: string; final: string; prompt: string;
  literal_subject: string; references: Array<{ file: string }>;
}> }).requests);
const v2Requests = (JSON.parse(readFileSync(
  'assets/jobs/docs-60-67-native-02-lexicon-built-in.json', 'utf8',
)) as { requests: Array<{
  id: string; native_asset_id: string; selected_output: string; source: string; file: string;
  prompt: string; literal_subject: string;
}> }).requests;
const legacyProvenance = JSON.parse(readFileSync(
  'assets/provenance/spell-effect-icon-generation.json', 'utf8',
)) as { selections: Array<{
  id: string; request_id: string; source: string; final: string; prompt: string;
  prompt_sha256: string; source_sha256: string; final_sha256: string;
}> };
const v2Provenance = JSON.parse(readFileSync(
  'assets/provenance/docs-60-67-native-generation.json', 'utf8',
)) as { selections: Array<{
  id: string; native_asset_id: string; source: string; final: string; prompt: string;
  prompt_sha256: string; source_sha256: string; final_sha256: string;
}> };

describe('shared spell-effect icon production contract', () => {
  it('covers every lexicon subject once through manifest, worklist, jobs, and provenance', () => {
    const ids = Object.keys(SPELL_EFFECT_ICON_MANIFEST) as SpellLexiconId[];
    expect(Object.keys(SPELL_EFFECT_ICON_MANIFEST)).toEqual(ids);
    expect(spellEffectIconWorklist().map((item) => item.id))
      .toEqual(ids.map((id) => `spell-effect-icon:${id}`));
    expect(legacyRequests).toHaveLength(30);
    expect(v2Requests).toHaveLength(8);
    expect(legacyProvenance.selections).toHaveLength(30);
    expect(v2Provenance.selections.filter(({ id }) => id.startsWith('spell-effect-icon:')))
      .toHaveLength(8);
    for (const id of ids) {
      const assetId = `spell-effect-icon:${id}`;
      const request = legacyRequests.find((entry) => entry.assets[0] === assetId);
      const v2Request = v2Requests.find((entry) => entry.native_asset_id === assetId);
      const selection = legacyProvenance.selections.find((entry) => entry.id === assetId);
      const v2Selection = v2Provenance.selections.find((entry) => entry.native_asset_id === assetId);
      const literalSubject = request?.literal_subject ?? v2Request?.literal_subject;
      const prompt = request?.prompt ?? v2Request?.prompt;
      expect(literalSubject, id).toBe(SPELL_LEXICON[id].visualSubject);
      expect(prompt, id).toContain(SPELL_LEXICON[id].visualSubject);
      if (request) {
        expect(request.references, id).toHaveLength(3);
        expect(selection?.request_id, id).toBe(request.id);
        expect(selection?.source, id).toBe(request.output);
        expect(selection?.final, id).toBe(request.final);
      } else {
        expect(v2Request?.selected_output, id).toBeTruthy();
        expect(v2Selection?.source, id).toBe(v2Request?.source);
        expect(v2Selection?.final, id).toBe(`public/${v2Request?.file}`);
      }
    }
  });

  it('retains exact unique prompt/source/final hashes', () => {
    const selections = [...legacyProvenance.selections,
      ...v2Provenance.selections.filter(({ id }) => id.startsWith('spell-effect-icon:'))];
    expect(new Set(selections.map((entry) => entry.prompt_sha256)).size).toBe(38);
    expect(new Set(selections.map((entry) => entry.source_sha256)).size).toBe(38);
    expect(new Set(selections.map((entry) => entry.final_sha256)).size).toBe(38);
    for (const entry of selections) {
      expect(sha(entry.prompt), entry.id).toBe(entry.prompt_sha256);
      expect(sha(readFileSync(entry.source)), entry.id).toBe(entry.source_sha256);
      expect(sha(readFileSync(entry.final)), entry.id).toBe(entry.final_sha256);
    }
  });
});
