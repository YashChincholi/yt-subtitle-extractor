import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import { YoutubeTranscript } from "youtube-transcript";

dotenv.config();

const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");

const PORT = process.env.PORT || 3000;
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : null;

app.use(
  cors({
    origin(origin, callback) {
      if (!IS_PRODUCTION) return callback(null, true);

      // Same-origin requests or no configured whitelist
      if (!origin || !ALLOWED_ORIGINS) {
        return callback(null, true);
      }

      if (ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }

      callback(new Error("Not allowed by CORS"));
    },
  }),
);

app.use(helmet({ crossOriginResourcePolicy: false }));

app.use(express.json({ limit: "20kb" }));

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: "Too many requests. Please try again later.",
    },
  }),
);

app.use(
  express.static("public", {
    etag: true,
    maxAge: IS_PRODUCTION ? "1d" : 0,
    index: "index.html",
  }),
);

function isValidYouTubeUrl(url) {
  try {
    const { hostname } = new URL(url);
    return hostname.includes("youtube.com") || hostname.includes("youtu.be");
  } catch {
    return false;
  }
}

app.post("/api/transcript", async (req, res) => {
  const { videoUrl } = req.body ?? {};

  if (!videoUrl) {
    return res
      .status(400)
      .json({ success: false, error: "YouTube URL is required." });
  }

  if (!isValidYouTubeUrl(videoUrl)) {
    return res
      .status(400)
      .json({ success: false, error: "Please enter a valid YouTube URL." });
  }

  const TIMEOUT_MS = 15_000;

  try {
    const transcript = await Promise.race([
      YoutubeTranscript.fetchTranscript(videoUrl),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Request timeout")), TIMEOUT_MS),
      ),
    ]);

    if (!transcript?.length) {
      return res.status(404).json({
        success: false,
        error: "No subtitles found for this video.",
      });
    }

    return res.status(200).json({
      success: true,
      count: transcript.length,
      data: transcript,
    });
  } catch (error) {
    if (IS_PRODUCTION === false)
      console.error("[Transcript Error]", error.message);

    if (error.message === "Request timeout") {
      return res.status(408).json({
        success: false,
        error: "Request timed out. Please try again.",
      });
    }

    console.error("=== TRANSCRIPT ERROR ===");
    console.error(error);
    console.error("Message:", error?.message);
    console.error("Stack:", error?.stack);

    return res.status(500).json({
      success: false,
      error: error?.message || "Unknown error",
    });
  }
});

app.use((_req, res) => {
  res.status(404).json({ success: false, error: "Endpoint not found." });
});

app.use((err, _req, res, _next) => {
  if (IS_PRODUCTION === false) console.error("[Unhandled Error]", err.message);
  res.status(500).json({ success: false, error: "Internal server error." });
});

app.listen(PORT, () => {
  console.log(`
========================================
  YouTube Subtitle Extractor
========================================
  Env  : ${process.env.NODE_ENV ?? "development"}
  Port : ${PORT}
  URL  : http://localhost:${PORT}
========================================
`);
});
