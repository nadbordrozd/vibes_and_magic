import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { pendingChoiceFixtures } from '../../sim/pending-choice-fixtures';
import { ChoiceDialog } from '../components/Dialogs';

function renderFixture(name: string): string {
  const fixture = pendingChoiceFixtures().find((candidate) => candidate.name === name);
  if (!fixture) throw new Error(`Missing pending-choice fixture ${name}`);
  return renderToStaticMarkup(<ChoiceDialog state={fixture.state} dispatch={() => undefined} />);
}

describe('pending-choice presentation', () => {
  it('names the source and exact terms for every executable PendingChoice family', () => {
    for (const fixture of pendingChoiceFixtures()) {
      const html = renderToStaticMarkup(
        <ChoiceDialog state={fixture.state} dispatch={() => undefined} />,
      );
      for (const fragment of fixture.expected) {
        expect(html, fixture.name).toContain(fragment.replaceAll("'", '&#x27;'));
      }
      for (const reason of fixture.disabledReasons ?? []) {
        expect(html, fixture.name).toContain(reason.replaceAll('’', '&#x27;'));
      }
    }
  });

  it('keeps an artifact chest reward enabled when every consumable slot is full', () => {
    const artifact = renderFixture('chest-artifact-full-consumables');
    const consumable = renderFixture('chest-consumable-full');
    expect(artifact).toMatch(/data-inspect-kind="artifact"[^>]*title="Take this artifact into the unlimited backpack\."/);
    expect(artifact).not.toMatch(/data-inspect-kind="artifact"[^>]*disabled=""/);
    expect(consumable).toMatch(/data-inspect-kind="item"[^>]*disabled=""/);
  });

  it('exposes catalog-backed offers and sources through inspection metadata', () => {
    for (const name of [
      'site-stat', 'chest-consumable-open', 'shrine-two-choices', 'inscription',
      'diplomacy-affordable', 'spellthief-rank-two', 'palimpsest', 'toll-unaffordable', 'siren',
    ]) {
      const html = renderFixture(name);
      expect(html).toContain(['data', 'inspect', 'kind'].join('-') + '=');
      expect(html).toContain(['data', 'inspect', 'id'].join('-') + '=');
    }
  });
});
