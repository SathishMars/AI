// src/app/components/SmartAutocomplete.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";
import { WorkflowAutocompleteItem } from '@/app/types/workflowAutocomplete';
import { WorkflowDefinition, WorkflowStep } from '../types/workflowTemplate';
import { apiFetch } from '@/app/utils/api';


interface SmartAutocompleteProps {
  autoFocus?: boolean;
  value?: string;
  onChange?: (value: string) => void;
  onKeyPress?: (event: React.KeyboardEvent) => void;
  placeholder?: string;
  disabled?: boolean;
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;
  workflowDefinition?: WorkflowDefinition; // Optional workflow definition to filter suggestions
  handleSendToAime?: (userMessage: string) => void;
}

// Virtual anchor compatible with Popper's VirtualElement
interface VirtualAnchor {
  getBoundingClientRect: () => DOMRect;
}

const getWorkflowSteps = (workflowDefinition: WorkflowDefinition | undefined): Array<WorkflowAutocompleteItem> => {
  if (!workflowDefinition || !workflowDefinition.steps) return [];
  let allSteps: Array<WorkflowAutocompleteItem> = [];
  // we need to recurseively get the list of steps from the workflow definition based on the workflowDefinition.steps array
  const getSteps = (steps: Array<WorkflowStep | string>): Array<WorkflowAutocompleteItem> => {
    let allSteps: Array<WorkflowAutocompleteItem> = [];
    steps.forEach((step: WorkflowStep | string) => {
      if (typeof step === 'string') return; // skip string steps (like 'end' or 'start')
      allSteps.push({
        id: step.id,
        label: step.label,
        name: step.stepFunction || step.label,
        description: step.stepFunction || '',
        type: step.type,
      });
      //Check in step.next is an array and has length, then recurse 
      if (step.next && Array.isArray(step.next) && step.next.length) {
        allSteps = allSteps.concat(getSteps(step.next));
      }
      if (step.onConditionPass) {
        if (typeof step.onConditionPass !== 'string') {
          allSteps = allSteps.concat(getSteps([step.onConditionPass]));
        }
      }
      if (step.onConditionFail) {
        if (typeof step.onConditionFail !== 'string') {
          allSteps = allSteps.concat(getSteps([step.onConditionFail]));
        }
      }
      if (step.onError) {
        if (typeof step.onError !== 'string') {
          allSteps = allSteps.concat(getSteps([step.onError]));
        }
      }
      if (step.onTimeout) {
        if (typeof step.onTimeout !== 'string') {
          allSteps = allSteps.concat(getSteps([step.onTimeout]));
        }
      }
    });
    return allSteps;
  };
  allSteps = getSteps(workflowDefinition.steps);
  return allSteps;
}

const MAX_SUGGESTIONS = 5; // Max number of suggestions to show
const AUTOCOMPLETE_SUGGESTIONS_TRIGGER = '@'; // Trigger character for autocomplete
const AUTOCOMPLETE_STEPS_TRIGGER = '#'; // Trigger character for autocomplete

// Enhanced SmartAutocomplete with multi-line support and autocomplete
export default function SmartAutocomplete({
  autoFocus = false,
  value,
  onChange,
  onKeyPress,
  placeholder,
  disabled,
  inputRef,
  workflowDefinition,
  handleSendToAime
}: SmartAutocompleteProps) {
  // Load and cache the autocomplete items once on mount from the backend api @ /api/workflow-autocomplete
  const [suggestions, setSuggestions] = useState<WorkflowAutocompleteItem[]>([]);
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowAutocompleteItem[]>([]);
  // loading state kept for potential future use
  const [, setLoading] = useState<boolean>(false);
  const [open, setOpen] = useState<boolean>(false);
  // anchorEl may be a real HTMLElement or a virtual element with getBoundingClientRect()
  const [anchorEl, setAnchorEl] = useState<HTMLElement | VirtualAnchor | null>(null);
  const [latestRect, setLatestRect] = useState<DOMRect | null>(null);
  const [triggerChar, setTriggerChar] = useState<string | null>(null);
  const [searchText, setSearchText] = useState<string>('');
  const [filtered, setFiltered] = useState<WorkflowAutocompleteItem[]>([]);
  const [highlightIndex, setHighlightIndex] = useState<number>(0);
  const menuRef = useRef<HTMLUListElement | null>(null);

  useEffect(() => {
    const loadAutocompleteItems = async () => {
      let isMounted = true;
      setLoading(true);
      const response = await apiFetch('/api/workflow-autocomplete');
      if (response.ok) {
        const data = await response.json();
        if (isMounted && Array.isArray(data)) {
          setSuggestions(data as WorkflowAutocompleteItem[]);
        }
      } else {
        if (isMounted) setSuggestions([]);
      }
      setLoading(false);
      return () => { isMounted = false; };
    };
    loadAutocompleteItems();
  }, []);

  useEffect(() => {
    setLoading(true);
    // Filter only workflow steps (functions) for suggestions
    setWorkflowSteps(getWorkflowSteps(workflowDefinition));
    // let us add mock steps for testing
    setWorkflowSteps([
      {
        id: 'mock-step-1', label: 'Mock Step 1', name: 'mockStep1',
        description: 'Don\'t know what this step does',
        type: 'task'
      },
      {
        id: 'mock-step-2', label: 'Mock Step 2', name: 'mockStep2',
        description: 'This is a mock step for testing',
        type: 'decision'
      },
    ]);

    setLoading(false);
  }, [workflowDefinition]);

  // Filter suggestions when trigger/searchText changes
  useEffect(() => {
    if (!triggerChar) {
      setFiltered([]);
      setOpen(false);
      return;
    }
    const source = triggerChar === AUTOCOMPLETE_STEPS_TRIGGER ? workflowSteps : suggestions;
    const q = (searchText || '').trim().toLowerCase();
    let results = source.filter((s) => {
      return (
        s.label?.toLowerCase().includes(q) || s.name?.toLowerCase().includes(q) || s.id?.toLowerCase().includes(q)
      );
    }).slice(0, MAX_SUGGESTIONS);
    // if query is empty, show top few
    if (!q) results = source.slice(0, MAX_SUGGESTIONS);
    setFiltered(results);
    setHighlightIndex(0);
    setOpen(results.length > 0);
  }, [triggerChar, searchText, suggestions, workflowSteps]);

  // Helper to find last trigger before caret
  const findTrigger = (text: string, caretPos: number): { char: string | null; start: number } => {
    const at = text.lastIndexOf(AUTOCOMPLETE_SUGGESTIONS_TRIGGER, caretPos - 1);
    const hash = text.lastIndexOf(AUTOCOMPLETE_STEPS_TRIGGER, caretPos - 1);
    const best = Math.max(at, hash);
    if (best === -1) return { char: null, start: -1 };
    const ch = text[best];
    // ensure char is not preceded by a non-space preventing char (e.g., ensure no space between trigger and caret)
    return { char: ch, start: best };
  };

  // Compute caret coordinates (viewport) for a textarea by creating a hidden mirror element.
  // Returns a DOMRect-like object or null on failure.
  const getCaretCoordinates = (textarea: HTMLTextAreaElement | HTMLInputElement | null, caretPos: number): DOMRect | null => {
    if (!textarea) return null;
    try {
      const style = window.getComputedStyle(textarea);
      try {
        // debug: log textarea viewport rect and caret position
        console.log('[SmartAutocomplete] getCaretCoordinates start', { caretPos, taRect: textarea.getBoundingClientRect() });
      } catch {
        // ignore
      }
      const div = document.createElement('div');
      // copy textarea styles that affect text layout
      const properties: Array<keyof CSSStyleDeclaration> = [
        'boxSizing', 'width', 'height', 'fontFamily', 'fontSize', 'fontStyle', 'fontWeight', 'lineHeight',
        'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'borderTopWidth', 'borderRightWidth',
        'borderBottomWidth', 'borderLeftWidth', 'whiteSpace', 'wordWrap', 'overflowWrap', 'letterSpacing',
      ];
      properties.forEach((prop) => {
        // assign via index signature to avoid `any`
        (div.style as unknown as Record<string, string>)[prop as string] = (style as unknown as Record<string, string>)[prop as string] || '';
      });
      div.style.position = 'absolute';
      div.style.visibility = 'hidden';
      div.style.pointerEvents = 'none';
      div.style.whiteSpace = 'pre-wrap';
      // match the same width to wrap lines similarly
      div.style.width = `${textarea.clientWidth}px`;

      // position the mirror at the textarea's viewport coordinates (account for scroll)
      const taRect = textarea.getBoundingClientRect();
      div.style.left = `${Math.round(taRect.left + window.scrollX)}px`;
      div.style.top = `${Math.round(taRect.top + window.scrollY)}px`;
      div.style.overflow = 'hidden';

      const text = (textarea as HTMLTextAreaElement).value ?? (textarea as HTMLInputElement).value ?? '';
      const before = text.substring(0, caretPos);
      const after = text.substring(caretPos);

      const spanBefore = document.createTextNode(before);
      const spanMark = document.createElement('span');
      spanMark.textContent = '\u200b'; // ZERO WIDTH SPACE marker
      const spanAfter = document.createTextNode(after);

      div.appendChild(spanBefore);
      div.appendChild(spanMark);
      // append a text node for after to preserve wrapping
      div.appendChild(spanAfter);

      document.body.appendChild(div);
      const rect = spanMark.getBoundingClientRect();
      // debug: log measured marker rect
      console.log('[SmartAutocomplete] getCaretCoordinates markerRect', rect);
      document.body.removeChild(div);
      return rect;
    } catch {
      return null;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const newVal = e.target.value;
    if (typeof onChange === 'function') {
      onChange(newVal);
    } else {
      console.warn('SmartAutocomplete: onChange prop is not a function');
    }

    const caret = inputRef?.current?.selectionStart ?? newVal.length;
    const trg = findTrigger(newVal, caret);
    if (trg.char) {
      const q = newVal.substring(trg.start + 1, caret);
      setTriggerChar(trg.char);
      setSearchText(q);
      // compute caret viewport coordinates and create a virtual anchor for Popper
      const rect = getCaretCoordinates(inputRef?.current ?? null, caret);
      // debug: log rect used for anchor
      console.log('[SmartAutocomplete] handleInputChange caretRect', rect, 'caretPos', caret);
      if (rect) {
        // anchor slightly below the caret so popper appears beneath the cursor
        const offsetY = 8; // px
        const virtualEl: VirtualAnchor = {
          getBoundingClientRect: () => new DOMRect(rect.left, rect.bottom + offsetY, rect.width, 0)
        };
        console.log('[SmartAutocomplete] handleInputChange virtualElRect', virtualEl.getBoundingClientRect());
        setLatestRect(virtualEl.getBoundingClientRect());
        setAnchorEl(virtualEl);
      } else {
        // fallback to anchoring to the textarea element itself
        console.log('[SmartAutocomplete] handleInputChange no rect, using textarea element as anchor');
        setLatestRect(null);
        setAnchorEl(inputRef?.current ?? null);
      }
    } else {
      setTriggerChar(null);
      setSearchText('');
    }
  };

  // Recompute anchor when suggestions open or filtered results change (caret may have moved)
  useEffect(() => {
    if (!open) return;
    const textarea = inputRef?.current as HTMLTextAreaElement | null;
    if (!textarea) return;
    const caret = textarea.selectionStart ?? (value ?? '').length;
    const rect = getCaretCoordinates(textarea, caret);
    // debug
    console.log('[SmartAutocomplete] recompute anchor effect', { rect, caret });
    if (rect) {
      const offsetY = 8;
      const virtual = { getBoundingClientRect: () => new DOMRect(rect.left, rect.bottom + offsetY, rect.width, 0) } as VirtualAnchor;
      console.log('[SmartAutocomplete] recompute anchor effect virtualRect', virtual.getBoundingClientRect());
      setLatestRect(virtual.getBoundingClientRect());
      setAnchorEl(virtual);
    }
  }, [open, filtered, value, inputRef]);

  // debug: log current anchorEl whenever it changes
  useEffect(() => {
    console.log('[SmartAutocomplete] anchorEl changed', anchorEl);
  }, [anchorEl]);

  const closeSuggestions = () => {
    setOpen(false);
    setTriggerChar(null);
    setSearchText('');
  };

  const insertSuggestion = (item: WorkflowAutocompleteItem) => {
    const textarea = inputRef?.current;
    if (!textarea) return;
    const safeValue = value ?? '';
    const caret = textarea.selectionStart ?? safeValue.length;
    const trg = findTrigger(safeValue, caret);
    const before = safeValue.substring(0, trg.start);
    const after = safeValue.substring(caret);
    // Insert the item.name at the trigger location
    const insertion = trg.char + "(" + (item.label || item.name || item.id) + ")";
    const newText = `${before}${insertion}${after}`;
    if (typeof onChange === 'function') {
      onChange(newText);
    } else {
      console.warn('SmartAutocomplete: onChange prop is not a function');
    }
    // move caret after inserted text
    window.setTimeout(() => {
      const pos = before.length + insertion.length;
      textarea.focus();
      textarea.setSelectionRange(pos, pos);
    }, 0);
    closeSuggestions();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    // If user presses Backspace or Delete and the caret/target is inside an encapsulated suggestion
    // (format: "@(label)"), remove the entire encapsulation instead of a single char.
    const tryRemoveEncapsulation = () => {
      const textarea = inputRef?.current as HTMLTextAreaElement | null;
      const currentValue = value ?? '';
      if (!textarea || !currentValue) return false;
      const selStart = textarea.selectionStart ?? 0;
      const selEnd = textarea.selectionEnd ?? selStart;

      const findBlockContaining = (str: string, idx: number) => {
        if (idx < 0 || idx >= str.length) return null;
        const start = str.lastIndexOf('@(', idx);
        if (start === -1) return null;
        const end = str.indexOf(')', start + 2);
        if (end === -1) return null;
        if (idx >= start && idx <= end) return { start, end };
        return null;
      };

      // If there is a selection, check if selection overlaps a block
      if (selStart !== selEnd) {
        // check for any block that intersects selection by finding block that contains selStart or selEnd-1
        const blockA = findBlockContaining(currentValue, selStart);
        const blockB = findBlockContaining(currentValue, Math.max(0, selEnd - 1));
        const block = blockA ?? blockB;
        if (block) {
          const before = currentValue.substring(0, block.start);
          const after = currentValue.substring(block.end + 1);
          const newText = before + after;
          if (typeof onChange === 'function') onChange(newText);
          window.setTimeout(() => {
            const pos = before.length;
            textarea.focus();
            textarea.setSelectionRange(pos, pos);
          }, 0);
          return true;
        }
        return false;
      }

      // No selection: determine target index of deletion
      let targetIndex = selStart;
      if ((e.key === 'Backspace')) {
        targetIndex = selStart - 1;
      } else if (e.key === 'Delete') {
        targetIndex = selStart;
      } else {
        return false;
      }
      const block = findBlockContaining(currentValue, targetIndex);
      if (block) {
        const before = currentValue.substring(0, block.start);
        const after = currentValue.substring(block.end + 1);
        const newText = before + after;
        if (typeof onChange === 'function') onChange(newText);
        // position caret at start of removed block
        window.setTimeout(() => {
          const pos = before.length;
          textarea.focus();
          textarea.setSelectionRange(pos, pos);
        }, 0);
        return true;
      }
      return false;
    };

    if ((e.key === 'Backspace' || e.key === 'Delete')) {
      const handled = tryRemoveEncapsulation();
      if (handled) {
        e.preventDefault();
        return;
      }
    }
    // Navigation in suggestion list
    if (open && (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === 'Escape')) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightIndex((i) => Math.min(i + 1, filtered.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        closeSuggestions();
        return;
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        // If popup open and an item is highlighted, choose it
        if (open && filtered.length > 0) {
          e.preventDefault();
          insertSuggestion(filtered[highlightIndex]);
          return;
        }
      }
    }

    // Send on Enter (without Shift) when popup closed
    if (e.key === 'Enter' && !e.shiftKey && !open) {
      e.preventDefault();
      if (typeof handleSendToAime === 'function') handleSendToAime(value ?? '');
      return;
    }

    // allow Shift+Enter for newline
    if (e.key === 'Enter' && e.shiftKey) {
      // don't intercept
      return;
    }

    // pass through to parent key handler if provided
    if (onKeyPress) onKeyPress(e as unknown as React.KeyboardEvent);
  };


  // debug: show some key state on render
  console.log('[SmartAutocomplete] render', { open, triggerChar, searchText, filteredCount: filtered.length, anchorEl });
  return (
    <div className="relative">
      <div className="relative">
        <Textarea
          autoFocus={autoFocus}
          ref={inputRef as unknown as React.Ref<HTMLTextAreaElement>}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={3}
          disabled={disabled}
          className={`w-full resize-y ${disabled ? 'bg-muted' : ''}`}
        />
        <Button
          type="button"
          size="icon-sm"
          className="absolute bottom-2 right-2"
          onClick={() => { if (typeof handleSendToAime === 'function') handleSendToAime(value ?? ''); }}
          aria-label="send"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {/* Autocomplete suggestions dropdown */}
      {open && anchorEl && (
        <div
          className="fixed bg-popover border rounded-md shadow-md min-w-[260px] z-[1300]"
          style={{
            left: latestRect?.left || 0,
            top: (latestRect?.top || 0) + (latestRect?.height || 0) + 6,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="py-1" ref={menuRef as React.Ref<HTMLDivElement>}>
            {filtered.map((item, idx) => (
              <button
                key={item.id}
                className={`w-full text-left px-4 py-2 hover:bg-accent cursor-pointer ${
                  idx === highlightIndex ? 'bg-accent' : ''
                }`}
                onClick={() => insertSuggestion(item)}
              >
                <div className="flex flex-col">
                  <strong className="text-sm">{item.label}</strong>
                  <small className="text-xs text-muted-foreground">{item.description}</small>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Debug overlay for caret position */}
      {latestRect && open && (
        <div
          className="fixed pointer-events-none border border-red-500 bg-red-500/25"
          style={{
            left: latestRect.left,
            top: latestRect.top,
            width: Math.max(8, latestRect.width || 8),
            height: 8,
            zIndex: 99999
          }}
        />
      )}
    </div>
  );
}