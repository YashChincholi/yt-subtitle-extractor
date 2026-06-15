import {
  formatMilliseconds,
  triggerDownload,
  extractVideoId,
} from "./utils.js";

const API_ENDPOINT = "/api/transcript";

let transcriptCache = [];
let currentVideoId = "transcript";

const $ = (id) => document.getElementById(id);

const dom = {
  videoUrl: $("videoUrl"),
  fetchBtn: $("fetchBtn"),
  statusMsg: $("statusMsg"),
  outputWrapper: $("outputWrapper"),
  displayPane: $("displayPane"),
  exportTxt: $("exportTxt"),
  exportSrt: $("exportSrt"),
  charCount: $("charCount"),
};

dom.fetchBtn.addEventListener("click", fetchTranscript);
dom.videoUrl.addEventListener(
  "keydown",
  (e) => e.key === "Enter" && fetchTranscript(),
);
dom.exportTxt.addEventListener("click", () => downloadTranscript("txt"));
dom.exportSrt.addEventListener("click", () => downloadTranscript("srt"));

async function fetchTranscript() {
  const url = dom.videoUrl.value.trim();

  transcriptCache = [];
  currentVideoId = "transcript";
  dom.displayPane.textContent = "";
  dom.outputWrapper.classList.add("hidden");

  if (!url) {
    showStatus("Please enter a YouTube video URL.", "error");
    return;
  }

  dom.fetchBtn.disabled = true;
  dom.fetchBtn.textContent = "Extracting…";
  showStatus("Fetching subtitles…", "loading");

  try {
    const res = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoUrl: url }),
    });

    const result = await res.json();

    if (!res.ok || !result.success)
      throw new Error(result.error || "Failed to fetch transcript.");

    transcriptCache = result.data;
    currentVideoId = extractVideoId(url);

    renderTranscript(transcriptCache);
    dom.outputWrapper.classList.remove("hidden");
    showStatus(`Extracted ${result.count} subtitle lines.`, "success");
  } catch (err) {
    showStatus(
      err.message || "Unable to extract subtitles. Please try again.",
      "error",
    );
  } finally {
    dom.fetchBtn.disabled = false;
    dom.fetchBtn.textContent = "Extract";
  }
}

function renderTranscript(data) {
  const fragment = document.createDocumentFragment();

  for (const item of data) {
    const row = document.createElement("div");
    row.className = "transcript-row";

    const time = document.createElement("span");
    time.className = "transcript-time";
    time.textContent = `[${formatMilliseconds(item.offset)}]`;

    const text = document.createElement("span");
    text.className = "transcript-text";
    text.textContent = item.text;

    row.append(time, text);
    fragment.appendChild(row);
  }

  dom.displayPane.appendChild(fragment);
}

function downloadTranscript(type) {
  if (!transcriptCache.length) {
    showStatus("No transcript available to export.", "error");
    return;
  }

  if (type === "txt") {
    const content = transcriptCache
      .map((item) => `[${formatMilliseconds(item.offset)}] ${item.text}`)
      .join("\n");
    triggerDownload(
      content,
      `${currentVideoId}.txt`,
      "text/plain;charset=utf-8",
    );
    return;
  }

  const content = transcriptCache
    .map((item, i) => {
      const start = formatMilliseconds(item.offset, true);
      const end = formatMilliseconds(
        item.offset + (item.duration || 2500),
        true,
      );
      return `${i + 1}\n${start} --> ${end}\n${item.text}\n`;
    })
    .join("\n");

  triggerDownload(content, `${currentVideoId}.srt`, "text/srt;charset=utf-8");
}

function showStatus(message, type) {
  const el = dom.statusMsg;
  el.textContent = message;
  el.className = "status-msg";
  el.classList.remove("hidden");

  const map = {
    loading: "status-loading",
    success: "status-success",
    error: "status-error",
  };

  el.classList.add(map[type] ?? map.error);

  if (type === "loading") el.classList.add("animate-pulse");
}
