import { describe, expect, it } from "vitest";
import { announcementLinkToStore, helpVideoToStore, videoEmbed } from "../../lib/help/video";

const env = { ...process.env, S3_PUBLIC_BASE_URL: "https://cdn.example.test/files" } as NodeJS.ProcessEnv;

describe("help media urls", () => {
  it("embeds YouTube, Vimeo, and our storage host only", () => {
    expect(helpVideoToStore("", env)).toBe("");
    expect(helpVideoToStore("https://www.youtube.com/watch?v=abcdefgh", env)).toContain("youtube.com");
    expect(videoEmbed("https://youtu.be/abcdefgh", env).kind).toBe("youtube");
    expect(videoEmbed("https://vimeo.com/123456", env).kind).toBe("vimeo");
    expect(videoEmbed("https://cdn.example.test/files/help/clip.mp4", env).kind).toBe("file");
    expect(helpVideoToStore("https://cdn.example.test/files/help/clip.mp4", env)).toContain("/help/clip.mp4");
    expect(helpVideoToStore("https://cdn.example.test/other/clip.mp4", env)).toBeNull();
    expect(helpVideoToStore("https://evil.example/watch.mp4", env)).toBeNull();
    expect(helpVideoToStore("javascript:alert(1)", env)).toBeNull();
    expect(videoEmbed("https://evil.example/?u=https://www.youtube.com/watch?v=abcdefgh", env).kind).toBe("none");
    expect(videoEmbed("https://cdn.example.test/files/help/clip.mp4", { S3_PUBLIC_BASE_URL: "" } as unknown as NodeJS.ProcessEnv).kind).toBe("none");
  });

  it("allows https and site paths for announcement links", () => {
    expect(announcementLinkToStore("")).toBe("");
    expect(announcementLinkToStore("https://qr24x7.in/help")).toBe("https://qr24x7.in/help");
    expect(announcementLinkToStore("/dashboard/billing")).toBe("/dashboard/billing");
    expect(announcementLinkToStore("http://example.com")).toBeNull();
    expect(announcementLinkToStore("//evil.example")).toBeNull();
    expect(announcementLinkToStore("javascript:alert(1)")).toBeNull();
    expect(announcementLinkToStore("/\\evil")).toBeNull();
  });
});
