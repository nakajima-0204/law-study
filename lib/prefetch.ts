const pending = new Set<string>();

export function prefetchCases(lawId: string, lawName: string): void {
  const cacheKey = `themisia_cases_${lawId}`;
  if (typeof localStorage === "undefined") return;
  if (localStorage.getItem(cacheKey)) return;
  if (pending.has(lawId)) return;
  pending.add(lawId);
  fetch(`/api/cases?lawId=${encodeURIComponent(lawId)}&lawName=${encodeURIComponent(lawName)}`)
    .then((r) => r.json())
    .then((d) => {
      if (Array.isArray(d) && d.length > 0) {
        localStorage.setItem(cacheKey, JSON.stringify(d));
      }
    })
    .catch(() => {})
    .finally(() => pending.delete(lawId));
}

export function backgroundPrefetchAll(
  laws: { id: string; name: string }[],
  delayMs = 3000
): void {
  if (typeof localStorage === "undefined") return;
  const uncached = laws.filter(
    (l) => !localStorage.getItem(`themisia_cases_${l.id}`)
  );
  if (uncached.length === 0) return;
  let i = 0;
  function next() {
    if (i >= uncached.length) return;
    const law = uncached[i++];
    prefetchCases(law.id, law.name);
    setTimeout(next, delayMs);
  }
  // 10秒後に開始（ページ初期レンダリングの邪魔をしない）
  setTimeout(next, 10000);
}
