#!/usr/bin/env bash
#
# codex-task.sh — dispatch ONE coding task to OpenAI Codex, then run the gate.
#
# The intended workflow: a supervising agent (or you) writes a precise, self-
# contained task, hands it to Codex here, and this script captures Codex's work
# and immediately runs the typecheck + test gate so nothing lands unverified.
#
# Usage:
#   scripts/codex-task.sh "Fix the stale golden fixture in faction-abilities.test.ts"
#   scripts/codex-task.sh -f docs/tasks/next.md          # read task from a file
#   echo "task text" | scripts/codex-task.sh             # read task from stdin
#   scripts/codex-task.sh --resume "address review: ..." # continue last session
#
# Env overrides:
#   SANDBOX=workspace-write|danger-full-access|read-only  (default: workspace-write)
#   MODEL=<model-id>                                      (default: codex config)
#   SKIP_GATE=1                                           (don't run tsc+test after)
#
set -uo pipefail

REPO="/mnt/c/Users/nadbo/projects/vibes_and_magic"
SANDBOX="${SANDBOX:-workspace-write}"
LOGDIR="$REPO/.codex-runs"
mkdir -p "$LOGDIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
LAST="$LOGDIR/$STAMP-last.md"
LOG="$LOGDIR/$STAMP.log"

RESUME=0
if [ "${1:-}" = "--resume" ]; then RESUME=1; shift; fi

# --- read the task ----------------------------------------------------------
if [ "${1:-}" = "-f" ]; then TASK="$(cat "$2")"
elif [ -n "${1:-}" ]; then TASK="$1"
else TASK="$(cat)"; fi

if [ -z "${TASK// }" ]; then echo "error: empty task" >&2; exit 2; fi

MODEL_ARG=(); [ -n "${MODEL:-}" ] && MODEL_ARG=(-m "$MODEL")

# --- dispatch to Codex ------------------------------------------------------
echo "▶ Codex (sandbox=$SANDBOX${MODEL:+, model=$MODEL}${RESUME:+, resume})"
if [ "$RESUME" = "1" ]; then
  # NOTE: `codex exec resume` inherits cwd + sandbox from the recorded session;
  # it does NOT accept --cd or -s (unlike plain `codex exec`). Only -o/-m/--json etc.
  codex exec resume --last \
    --skip-git-repo-check "${MODEL_ARG[@]}" -o "$LAST" \
    "$TASK" 2>&1 | tee "$LOG"
else
  codex exec \
    --cd "$REPO" -s "$SANDBOX" --skip-git-repo-check "${MODEL_ARG[@]}" -o "$LAST" \
    "$TASK" 2>&1 | tee "$LOG"
fi

echo
echo "── Codex final message ──────────────────────────────────"
cat "$LAST" 2>/dev/null || echo "(no final message captured)"
echo "─────────────────────────────────────────────────────────"

# --- gate: typecheck + tests ------------------------------------------------
GATE_FAIL=""
if [ "${SKIP_GATE:-}" != "1" ]; then
  echo "▶ gate: tsc -b"
  if npx tsc -b; then echo "  ✓ typecheck"; else echo "  ✗ typecheck FAILED"; GATE_FAIL=1; fi
  echo "▶ gate: npm test"
  if npm test; then echo "  ✓ tests"; else echo "  ✗ tests FAILED"; GATE_FAIL=1; fi
fi

echo
echo "▶ git diff --stat:"
git -C "$REPO" diff --stat | tail -40
echo
echo "logs: $LAST"
echo "      $LOG"

if [ -n "$GATE_FAIL" ]; then
  echo "RESULT: GATE FAILED — review the diff, then re-run with --resume and specific feedback."
  exit 1
fi
echo "RESULT: GATE PASSED"
