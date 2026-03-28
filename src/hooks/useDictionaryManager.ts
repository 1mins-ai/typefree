import { useEffect, useMemo, useState } from "react";
import type { TFunction } from "i18next";
import { parsePhraseHints, serializePhraseHints } from "../lib/appHelpers";

interface UseDictionaryManagerOptions {
  phraseHints: string;
  onPhraseHintsChange: (phraseHints: string) => void;
  t: TFunction;
}

export function useDictionaryManager({
  phraseHints,
  onPhraseHintsChange,
  t,
}: UseDictionaryManagerOptions) {
  const [dictionaryWords, setDictionaryWords] = useState<string[]>([]);
  const [dictionaryQuery, setDictionaryQuery] = useState("");
  const [dictionaryDialogOpen, setDictionaryDialogOpen] = useState(false);
  const [dictionaryDialogMode, setDictionaryDialogMode] = useState<"add" | "edit">("add");
  const [editingWordIndex, setEditingWordIndex] = useState<number | null>(null);
  const [dictionaryDraft, setDictionaryDraft] = useState("");
  const [dictionaryValidation, setDictionaryValidation] = useState("");

  useEffect(() => {
    setDictionaryWords(parsePhraseHints(phraseHints));
  }, [phraseHints]);

  const filteredDictionaryWords = useMemo(() => {
    const query = dictionaryQuery.trim().toLowerCase();
    if (!query) return dictionaryWords;
    return dictionaryWords.filter((word) => word.toLowerCase().includes(query));
  }, [dictionaryQuery, dictionaryWords]);

  function syncDictionaryWords(nextWords: string[]) {
    setDictionaryWords(nextWords);
    onPhraseHintsChange(serializePhraseHints(nextWords));
  }

  function closeDictionaryDialog() {
    setDictionaryDialogOpen(false);
    setDictionaryDraft("");
    setDictionaryValidation("");
    setEditingWordIndex(null);
    setDictionaryDialogMode("add");
  }

  function openAddDictionaryDialog() {
    setDictionaryDialogMode("add");
    setEditingWordIndex(null);
    setDictionaryDraft("");
    setDictionaryValidation("");
    setDictionaryDialogOpen(true);
  }

  function openEditDictionaryDialog(index: number) {
    setDictionaryDialogMode("edit");
    setEditingWordIndex(index);
    setDictionaryDraft(dictionaryWords[index] ?? "");
    setDictionaryValidation("");
    setDictionaryDialogOpen(true);
  }

  function submitDictionaryWord() {
    const normalized = dictionaryDraft.trim();

    if (!normalized) {
      setDictionaryValidation(t("dictionaryPage.requiredError"));
      return;
    }

    const duplicateIndex = dictionaryWords.findIndex(
      (word, index) => word === normalized && index !== editingWordIndex,
    );

    if (duplicateIndex !== -1) {
      setDictionaryValidation(t("dictionaryPage.duplicateError"));
      return;
    }

    const nextWords = [...dictionaryWords];
    if (dictionaryDialogMode === "edit" && editingWordIndex !== null) {
      nextWords[editingWordIndex] = normalized;
    } else {
      nextWords.push(normalized);
    }

    syncDictionaryWords(nextWords);
    closeDictionaryDialog();
  }

  function removeDictionaryWord(index: number) {
    syncDictionaryWords(dictionaryWords.filter((_, currentIndex) => currentIndex !== index));
  }

  return {
    dictionaryWords,
    dictionaryQuery,
    setDictionaryQuery,
    dictionaryDialogOpen,
    dictionaryDialogMode,
    dictionaryDraft,
    setDictionaryDraft,
    dictionaryValidation,
    setDictionaryValidation,
    filteredDictionaryWords,
    closeDictionaryDialog,
    openAddDictionaryDialog,
    openEditDictionaryDialog,
    submitDictionaryWord,
    removeDictionaryWord,
  };
}
