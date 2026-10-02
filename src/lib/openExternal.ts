/** Opens a page in the system browser. The Tauri capability only allows this repository's pages. */
export async function openExternal(url: string): Promise<void> {
  if ("__TAURI_INTERNALS__" in window) {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(url);
  } else {
    window.open(url, "_blank", "noopener");
  }
}
