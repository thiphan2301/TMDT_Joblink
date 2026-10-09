import { useState } from "react";

const KEY = "joblink-saved-jobs";

function readSavedJobs() {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(value)
      ? value.filter(Number.isInteger)
      : [];
  } catch {
    return [];
  }
}

export default function useSavedJobs() {
  const [savedIds, setSavedIds] = useState(readSavedJobs);
  const [saveError, setSaveError] = useState("");

  function toggleSave(id) {
    const next = savedIds.includes(id)
      ? savedIds.filter((value) => value !== id)
      : [...savedIds, id];

    setSavedIds(next);

    try {
      localStorage.setItem(KEY, JSON.stringify(next));
      setSaveError("");
    } catch {
      setSaveError("Không thể lưu lâu dài trên trình duyệt này.");
    }
  }

  return { savedIds, toggleSave, saveError };
}