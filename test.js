import { YoutubeTranscript } from "youtube-transcript";

try {
  const transcript = await YoutubeTranscript.fetchTranscript(
    "https://youtu.be/dJPVV0nFFWY",
  );

  console.log("SUCCESS");
  console.log(transcript.length);
} catch (err) {
  console.log("FAILED");
  console.log(err.name);
  console.log(err.message);
}
