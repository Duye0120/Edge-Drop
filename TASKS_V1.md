# Tasks and notes v1

Development continues from saved commit `7cbdd3a4d85f01d640e62801b4154607b99a11cf` on `feat/edge-tasks-v1`.

Open the edge panel and select **Tasks & notes / 待办与备忘**. Clipboard capture, clipboard search, emoji, pinned clipboard items, drag and drop, and the existing edge controls remain available through **Clipboard / 剪贴板**.

- Create a task or note with an optional local date and time. Task times mean “due”; note times mean “review”. There are no alarms or OS notifications in this version.
- Use All, Today, Upcoming or Archive, and search within that view. Due and completed groups can be expanded. Untimed cards remain until archived.
- Complete/reopen tasks, pin cards, archive/restore them, or undo the latest completion/archive action. An archived card retains its completion state.
- Save explicitly, or press Ctrl/Cmd+Enter in the text field. Escape cancels the editor. Switching to Clipboard or Settings retains the in-memory draft. Save errors retain the draft. Concurrent edits require choosing the draft or saved version before retrying.
- The new UI supports Chinese and English; other application languages use English for these controls.

Storage, backup recovery, retained archive data, limits and disabled application updates are described in [PRIVACY.md](PRIVACY.md). A user with an older `updateMode=auto` profile cannot reactivate the upstream updater. The Store identity and signing configuration are inherited development metadata and are not authorization to distribute a Store package.

## Development checks

Use Node.js 24 and `npm ci`, then `npm run typecheck`, `npm test`, and `npm run build`. The GitHub Actions validation workflow runs these on Linux and Windows without packaging, merging or releasing.

On a managed cloud executor, npm and Electron caches may need writable paths. Use the executor's existing proxy and CA settings; Node's Electron downloader may require `NODE_USE_ENV_PROXY=1`.

Cloud Chromium interaction checks use a simulated preload bridge. They exercise the actual React interface but do not prove Windows DPAPI, NOACTIVATE focus handoff, native date-picker placement, global hotkeys, screen-edge detection, multi-monitor geometry, native clipboard formats, drag and drop, startup, or installer behavior. Those need a Windows desktop smoke test before distribution.
