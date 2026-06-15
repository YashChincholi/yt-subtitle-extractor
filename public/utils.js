export function formatMilliseconds(ms, isSRT = false) {
  const totalSeconds = Math.floor(ms / 1000);
  const h = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const s = String(totalSeconds % 60).padStart(2, "0");
  if (isSRT) return `${h}:${m}:${s},${String(ms % 1000).padStart(3, "0")}`;
  return `${h}:${m}:${s}`;
}

export function triggerDownload(content, filename, mimeType) {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const a = Object.assign(document.createElement("a"), {
    href: url,
    download: filename,
  });
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function extractVideoId(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be"))
      return parsed.pathname.slice(1) || "transcript";
    if (parsed.searchParams.has("v")) return parsed.searchParams.get("v");
    const parts = parsed.pathname.split("/");
    const i = parts.indexOf("embed");
    return i !== -1 && parts[i + 1] ? parts[i + 1] : "transcript";
  } catch {
    return "transcript";
  }
}
