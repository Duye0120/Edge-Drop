# Privacy Policy for this Edge-Drop fork

Last updated: November 3, 2026

This fork keeps clipboard history, settings, tasks and notes on your computer. It has no analytics or telemetry. The tasks and notes feature does not send card content to a server or add it to clipboard history.

Game mode pauses automatic panel activation and visual hints; it does not pause clipboard capture. Existing incognito and retention settings still govern capture. The interface-font setting reads installed family names locally and stores your selected name in local settings. The font list and preview text are not sent to a service, and this feature does not download or upload fonts.

## Network activity

Automatic and manual application update checks, downloads and installation are disabled in this fork, including when an existing profile has automatic updates enabled. It does not contact upstream GitHub releases. Packaging metadata points to `Duye0120/Edge-Drop`; this branch does not provide an update feed.

The existing image import feature may download an image when you explicitly import or drop an HTTP/HTTPS image URL. Links you choose to open are handed to your browser or another system application. Those destinations have their own privacy policies. No task or note contents are attached to these requests.

## Local storage and retention

Data lives in Electron's per-user `userData` directory, normally `%APPDATA%/edge-drop` on Windows. The exact path can differ between standalone and Store installations.

Tasks and notes use a separate `board-v1.json` file, encrypted through Electron `safeStorage` (Windows user-profile encryption on Windows). Saved changes replace the file only after the encrypted temporary file has been flushed. The previous save is retained as `board-v1.json.bak`. If the primary is damaged, a valid backup can be recovered and the unreadable primary is preserved. If neither copy can be read or encryption is unavailable, editing is locked and existing files are left untouched. Access to the original Windows profile may be required for recovery; these files are not a portable export.

Cards have no automatic expiry. Completing or archiving a card retains it; archived cards can be restored. Clearing clipboard history, its retention limits, and temporary-file cleanup do not delete tasks or notes. Unsaved drafts stay in memory while switching views and are lost when the app exits. This first version has no permanent card deletion or export control; its 10,000-card limit includes archived cards. Local backups and preserved recovery files may contain older card content. Encryption does not protect against software already running as your Windows user.

Clipboard history retains its existing local storage and clearing controls. Uninstalling the application may leave per-user data and backups behind. Remove the applicable user-data directory separately if you intend to erase it.

## Contact

Report privacy issues to [this fork's repository](https://github.com/Duye0120/Edge-Drop/issues).
