import {
  Fragment, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import {
  SPELL_LEXICON, tokenizeSpellLexiconText, type SpellLexiconId,
  type SpellRulePresentation,
} from '../../content/spellLexicon';
import { SpellEffectIcon } from './SpellEffectIcon';

interface ReferenceProps {
  termId: SpellLexiconId;
  label?: string;
  className?: string;
}

interface Position { left: number; top: number }

/** One accessible interaction contract for every player-facing spell-mechanic term. */
export function SpellGlossaryReference({ termId, label, className = '' }: ReferenceProps) {
  const definition = SPELL_LEXICON[termId];
  const id = useId().replace(/:/g, '');
  const trigger = useRef<HTMLButtonElement>(null);
  const popover = useRef<HTMLDivElement>(null);
  const suppressNextFocusOpen = useRef(false);
  const hoverTimer = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<Position>({ left: 12, top: 12 });

  const place = () => {
    const anchor = trigger.current?.getBoundingClientRect();
    const panel = popover.current?.getBoundingClientRect();
    if (!anchor || !panel) return;
    const gutter = 12;
    const gap = 8;
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = document.documentElement.clientHeight;
    const left = Math.min(Math.max(gutter, anchor.left + anchor.width / 2 - panel.width / 2),
      Math.max(gutter, viewportWidth - panel.width - gutter));
    const below = anchor.bottom + gap;
    const above = anchor.top - panel.height - gap;
    const top = below + panel.height <= viewportHeight - gutter ? below
      : Math.max(gutter, above);
    setPosition({ left, top });
  };

  useLayoutEffect(() => { if (open) place(); }, [open]);
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!trigger.current?.contains(target) && !popover.current?.contains(target)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      if (hoverTimer.current !== null) window.clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
      setOpen(false);
      if (document.activeElement !== trigger.current) {
        suppressNextFocusOpen.current = true;
        trigger.current?.focus();
      }
    };
    const onLayout = () => place();
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onLayout);
    window.addEventListener('scroll', onLayout, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onLayout);
      window.removeEventListener('scroll', onLayout, true);
    };
  }, [open]);

  useEffect(() => () => {
    if (hoverTimer.current !== null) window.clearTimeout(hoverTimer.current);
  }, []);

  const cancelHoverTimer = () => {
    if (hoverTimer.current !== null) window.clearTimeout(hoverTimer.current);
    hoverTimer.current = null;
  };
  const openAfterHoverIntent = () => {
    cancelHoverTimer();
    hoverTimer.current = window.setTimeout(() => {
      setOpen(true);
      hoverTimer.current = null;
    }, 220);
  };
  const closeAfterHoverLeave = () => {
    cancelHoverTimer();
    hoverTimer.current = window.setTimeout(() => {
      if (document.activeElement !== trigger.current
          && !popover.current?.contains(document.activeElement)) setOpen(false);
      hoverTimer.current = null;
    }, 180);
  };

  const closeAndRestoreFocus = () => {
    cancelHoverTimer();
    setOpen(false);
    if (document.activeElement !== trigger.current) {
      suppressNextFocusOpen.current = true;
      trigger.current?.focus();
    }
  };
  const panelStyle: CSSProperties = { left: position.left, top: position.top };

  return <>
    <button ref={trigger} type="button"
      className={`spell-glossary-reference ${className}`}
      data-spell-term={termId} aria-haspopup="dialog" aria-expanded={open}
      aria-controls={`${id}-glossary`} aria-label={`${label ?? definition.name}: open glossary rule`}
      onMouseEnter={openAfterHoverIntent} onMouseLeave={closeAfterHoverLeave} onFocus={() => {
        cancelHoverTimer();
        if (suppressNextFocusOpen.current) suppressNextFocusOpen.current = false;
        else setOpen(true);
      }}
      onClick={() => { cancelHoverTimer(); setOpen(true); }}>
      <SpellEffectIcon id={termId} decorative />
      <span>{label ?? definition.name}</span>
    </button>
    {open && typeof document !== 'undefined' && createPortal(
      <div ref={popover} id={`${id}-glossary`} className="spell-glossary-popover"
        onMouseEnter={cancelHoverTimer} onMouseLeave={closeAfterHoverLeave}
        style={panelStyle} role="dialog" aria-labelledby={`${id}-name`}
        aria-describedby={`${id}-rule`} data-spell-glossary={termId}>
        <header>
          <SpellEffectIcon id={termId} decorative />
          <b id={`${id}-name`}>{definition.name}</b>
          <button type="button" aria-label={`Close ${definition.name} glossary rule`}
            onClick={closeAndRestoreFocus}>×</button>
        </header>
        <p id={`${id}-rule`}>{definition.rule}</p>
      </div>, document.body,
    )}
  </>;
}

export function SpellRuleText({ tokens, className = '' }: {
  tokens: SpellRulePresentation; className?: string;
}) {
  return <span className={`spell-rule-text ${className}`}>{tokens.map((token, index) =>
    token.kind === 'text' ? <Fragment key={index}>{token.text}</Fragment>
      : <SpellGlossaryReference key={`${index}-${token.termId}`} termId={token.termId}
        label={token.label} />)}</span>;
}

/** Semantic renderer for legacy/catalog prose that does not yet carry authored rule tokens. */
export function SemanticSpellText({ children, className = '' }: {
  children: string; className?: string;
}) {
  return <SpellRuleText tokens={tokenizeSpellLexiconText(children)} className={className} />;
}

/** Direct glossary detail for static indexes where opening a nested popover would add noise. */
export function SpellGlossaryDefinition({ termId }: { termId: SpellLexiconId }): ReactNode {
  const definition = SPELL_LEXICON[termId];
  return <div className="spell-glossary-definition" data-spell-definition={termId}>
    <dt><SpellEffectIcon id={termId} decorative />{definition.name}</dt>
    <dd>{definition.rule}</dd>
  </div>;
}
