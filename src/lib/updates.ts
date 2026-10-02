import { isNewer, parseVersion } from "./version";

const REPO = "UnratedNDU/almanac";
export const LATEST_RELEASE_API = `https://api.github.com/repos/${REPO}/releases/latest`;
const TIMEOUT_MS = 8000;

export type UpdateCheck =
  | { status: "upToDate" }
  | { status: "available"; version: string; notes: string; url: string }
  | { status: "failed" };

/**
 * Asks GitHub for the latest published release of Almanac. Only a public list is read and nothing about the user is sent.
 * The download page is built from the validated tag, never taken from the answer.
 */
export async function checkForUpdate(current: string, fetchImpl: typeof fetch = fetch): Promise<UpdateCheck> {
  try {
    const response = await fetchImpl(LATEST_RELEASE_API, {
      headers: { Accept: "application/vnd.github+json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) return { status: "failed" };
    const release = (await response.json()) as { tag_name?: unknown; body?: unknown };
    if (typeof release.tag_name !== "string" || !parseVersion(release.tag_name)) return { status: "failed" };
    if (!isNewer(release.tag_name, current)) return { status: "upToDate" };
    const version = release.tag_name.replace(/^v/, "");
    return {
      status: "available",
      version,
      notes: typeof release.body === "string" ? release.body : "",
      url: `https://github.com/${REPO}/releases/tag/v${version}`,
    };
  } catch {
    return { status: "failed" };
  }
}
