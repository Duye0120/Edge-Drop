# Tasks and notes v1

Development continues from saved commit `7cbdd3a4d85f01d640e62801b4154607b99a11cf` on `feat/edge-tasks-v1`.

Open the edge panel and select **Tasks & notes / 待办与备忘**. Clipboard capture, clipboard search, emoji, pinned clipboard items, drag and drop, and the existing edge controls remain available through **Clipboard / 剪贴板**.

- Create a task or note with an optional local date and time. Task times mean “due”; note times mean “review”. There are no alarms or OS notifications in this version.
- Use All, Today, Upcoming or Archive, and search within that view. Due and completed groups can be expanded. Untimed cards remain until archived.
- Complete/reopen tasks, pin cards, archive/restore them, or undo the latest completion/archive action. An archived card retains its completion state.
- Save explicitly, or press Ctrl/Cmd+Enter in the text field. Escape cancels the editor. Switching to Clipboard or Settings retains the in-memory draft. Save errors retain the draft. Concurrent edits require choosing the draft or saved version before retrying.
- The new UI supports simplified Chinese, traditional Chinese and English; other application languages use English for these controls. Card dates follow the selected application language. Enter an optional local time as `2026-11-06 15:30`, or use the native picker shortcut. The operating system controls the language of the native picker popup.
- The panel follows the existing dark shelf design with shared tabs, search, card surfaces and action pills. Text follows the app's font-size setting. The app does not currently offer a separate light panel theme; Windows light/dark taskbar icon behavior remains unchanged.

## Game mode and fonts

Turn on **Game mode / 游戏模式** in Settings → Behaviour or the tray menu before playing. It hides the closed edge bar and copy hints, blocks hover and external-drag activation, and suppresses automatic location confirmations and welcome-tour popups. Turning it on closes the panel. The setting persists until you turn it off, including across restarts. Clipboard capture continues according to your existing incognito and retention settings.

Your configured toggle shortcut (Alt+C by default) and the tray still open/close the panel deliberately, including while game mode is on. Use either to reach the switch and turn game mode off. Game mode preserves your hover and fullscreen-protection choices. The existing Windows fullscreen detector remains available; it is not reliable detection of every game or borderless window. Use the manual switch when automatic detection does not cover your game.

Settings → Appearance → **Interface font / 界面字体** lists installed system families and accepts a local family name. The setting and a mixed-script preview apply to the interface; code keeps its monospace font. A missing family or glyph uses the bundled/default Windows fonts. Reset restores the default font. Family names are stored locally as a single escaped CSS string; no font files are imported or downloaded. Restart the app to refresh the installed-font list after installing fonts. The top dock provides the same font controls in a scrollable settings card.

Storage, backup recovery, retained archive data, limits and disabled application updates are described in [PRIVACY.md](PRIVACY.md). A user with an older `updateMode=auto` profile cannot reactivate the upstream updater. The Store identity and signing configuration are inherited development metadata and are not authorization to distribute a Store package.

## Development checks

Use Node.js 24 and `npm ci`, then `npm run typecheck`, `npm test`, and `npm run build`. The GitHub Actions validation workflow runs these on Linux and Windows without packaging, merging or releasing.

On a managed cloud executor, npm and Electron caches may need writable paths. Use the executor's existing proxy and CA settings; Node's Electron downloader may require `NODE_USE_ENV_PROXY=1`.

Cloud Chromium interaction checks use a simulated preload bridge. They exercise the actual React interface but do not prove Windows DPAPI, NOACTIVATE focus handoff, native date-picker placement, global hotkeys, screen-edge detection, multi-monitor geometry, native clipboard formats, drag and drop, startup, or installer behavior. Those need a Windows desktop smoke test before distribution.
