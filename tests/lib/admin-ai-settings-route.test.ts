import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  requireAdminApi: vi.fn(),
  logAudit: vi.fn(),
  getClientIp: vi.fn(),
  getImageAiConfig: vi.fn(),
  setImageAiConfig: vi.fn(),
  getAiConfig: vi.fn(),
  setAiConfig: vi.fn()
}));

vi.mock("@/lib/admin", () => ({ requireAdminApi: mocks.requireAdminApi, logAudit: mocks.logAudit }));
vi.mock("@/lib/utils", () => ({ getClientIp: mocks.getClientIp }));
vi.mock("@/lib/settings", () => ({
  getImageAiConfig: mocks.getImageAiConfig,
  setImageAiConfig: mocks.setImageAiConfig,
  getAiConfig: mocks.getAiConfig,
  setAiConfig: mocks.setAiConfig
}));

import { PUT as putImageAi } from "../../app/api/admin/settings/image-ai/route";
import { PUT as putTextAi } from "../../app/api/admin/settings/ai/route";

const imageConfig = {
  enabled: true, apiUrl: "https://image.example/v1", apiKey: "stored-image-secret", model: "image-model",
  size: "1024x1024", stylePrompt: "", estimatePaisePerImage: 0, dailyCapPaise: 0
};
const textConfig = {
  enabled: true, apiUrl: "https://text.example/v1", apiKey: "stored-text-secret", model: "text-model",
  dailyCapPaise: 0, estimatePaisePerCall: 0
};

function request(url: string, apiKey: string) {
  return new NextRequest(url, { method: "PUT", body: JSON.stringify({ apiKey }) });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAdminApi.mockResolvedValue({ user: { id: "admin_1" } });
  mocks.logAudit.mockResolvedValue(undefined);
  mocks.getClientIp.mockReturnValue("127.0.0.1");
  mocks.getImageAiConfig.mockResolvedValue(imageConfig);
  mocks.getAiConfig.mockResolvedValue(textConfig);
  mocks.setImageAiConfig.mockResolvedValue(undefined);
  mocks.setAiConfig.mockResolvedValue(undefined);
});

describe("AI settings API key masking", () => {
  it.each(["sto••••••ret", "   "])("keeps the stored image key when the submitted key is %j", async (apiKey) => {
    await putImageAi(request("http://localhost/api/admin/settings/image-ai", apiKey));
    expect(mocks.setImageAiConfig).toHaveBeenCalledWith(expect.objectContaining({ apiKey: imageConfig.apiKey }), "admin_1");
  });

  it.each(["sto••••••ret", "   "])("keeps the stored text key when the submitted key is %j", async (apiKey) => {
    await putTextAi(request("http://localhost/api/admin/settings/ai", apiKey));
    expect(mocks.setAiConfig).toHaveBeenCalledWith(expect.objectContaining({ apiKey: textConfig.apiKey }), "admin_1");
  });
});
