import { describe, expect, it } from "vitest";

import { classifyEntries, classifyEntry } from "@/lib/blackboard-parser";

describe("classifyEntry", () => {
  it("marks html, pdf, docx, and pptx as examinable", () => {
    expect(classifyEntry("csfiles/lecture.html")?.examinable).toBe(true);
    expect(classifyEntry("csfiles/notes.pdf")?.examinable).toBe(true);
    expect(classifyEntry("csfiles/syllabus.docx")?.examinable).toBe(true);
    expect(classifyEntry("csfiles/slides.pptx")?.examinable).toBe(true);
  });

  it("marks a video as not examinable with a reason", () => {
    const result = classifyEntry("csfiles/intro.mp4");
    expect(result).not.toBeNull();
    expect(result?.fileType).toBe("video");
    expect(result?.examinable).toBe(false);
    expect(result?.reason).toBeTruthy();
  });

  it("marks audio and interactive content as not examinable", () => {
    expect(classifyEntry("a/podcast.mp3")?.fileType).toBe("audio");
    expect(classifyEntry("a/podcast.mp3")?.examinable).toBe(false);
    expect(classifyEntry("a/game.swf")?.fileType).toBe("scorm");
    expect(classifyEntry("a/scorm-package.zip")?.examinable).toBe(false);
  });

  it("classifies unknown extensions as other/not examinable", () => {
    const result = classifyEntry("a/data.bin");
    expect(result?.fileType).toBe("other");
    expect(result?.examinable).toBe(false);
  });

  it("skips directories, manifest, and metadata entries", () => {
    expect(classifyEntry("csfiles/")).toBeNull();
    expect(classifyEntry("imsmanifest.xml")).toBeNull();
    expect(classifyEntry("res00001.dat")).toBeNull();
    expect(classifyEntry("__MACOSX/._lecture.html")).toBeNull();
    expect(classifyEntry(".DS_Store")).toBeNull();
  });
});

describe("classifyEntries", () => {
  it("splits a mixed package, orders examinable first, and de-dupes", () => {
    const files = classifyEntries([
      "imsmanifest.xml",
      "csfiles/intro.mp4",
      "csfiles/lecture.html",
      "csfiles/lecture.html",
      "res00001.dat",
      "csfiles/notes.pdf",
    ]);

    expect(files).toHaveLength(3);
    // examinable first
    expect(files.slice(0, 2).every((file) => file.examinable)).toBe(true);
    // the video is present and flagged not-examinable
    const video = files.find((file) => file.fileType === "video");
    expect(video?.examinable).toBe(false);
  });
});
