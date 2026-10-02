import { describe, expect, it, vi } from "vitest";
import { checkForUpdate, LATEST_RELEASE_API } from "./updates";

const reply = (body: unknown, status = 200) => vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => new Response(JSON.stringify(body), { status }));

describe("checkForUpdate", () => {
  it("reports a newer release with its notes and a download page built from the tag", async () => {
    const fetchImpl = reply({ tag_name: "v0.3.0", body: "### Novedades\n- Algo", html_url: "https://evil.example/x" });
    expect(await checkForUpdate("0.2.0", fetchImpl)).toEqual({
      status: "available",
      version: "0.3.0",
      notes: "### Novedades\n- Algo",
      url: "https://github.com/UnratedNDU/almanac/releases/tag/v0.3.0",
    });
    expect(fetchImpl.mock.calls[0][0]).toBe(LATEST_RELEASE_API);
  });

  it("is up to date when the release is the same or older", async () => {
    expect(await checkForUpdate("0.2.0", reply({ tag_name: "v0.2.0", body: "" }))).toEqual({ status: "upToDate" });
    expect(await checkForUpdate("0.3.0", reply({ tag_name: "v0.2.0", body: "" }))).toEqual({ status: "upToDate" });
  });

  it("treats a missing release body as empty notes", async () => {
    expect(await checkForUpdate("0.1.0", reply({ tag_name: "v0.2.0", body: null }))).toMatchObject({ status: "available", notes: "" });
  });

  it("fails quietly on a bad answer, a bad tag or no connection", async () => {
    expect(await checkForUpdate("0.2.0", reply({ message: "rate limited" }, 403))).toEqual({ status: "failed" });
    expect(await checkForUpdate("0.2.0", reply({ tag_name: "nightly" }))).toEqual({ status: "failed" });
    expect(await checkForUpdate("0.2.0", vi.fn(async (_url: string | URL | Request) => { throw new TypeError("offline"); }))).toEqual({ status: "failed" });
  });
});
