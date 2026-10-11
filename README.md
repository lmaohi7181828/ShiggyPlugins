# ShiggyPlugins

Plugins for **ShiggyCord**.

## Install (URL must end with `/`)

| Plugin | URL |
|--------|-----|
| CustomProfile | `https://raw.githubusercontent.com/lmaohi7181828/ShiggyPlugins/main/builds/CustomProfile/` |
| ShareX | `https://raw.githubusercontent.com/lmaohi7181828/ShiggyPlugins/main/builds/ShareX/` |
| ShowBadgesInChat | `https://raw.githubusercontent.com/lmaohi7181828/ShiggyPlugins/main/builds/ShowBadgesInChat/` |
| TruePresence | `https://raw.githubusercontent.com/lmaohi7181828/ShiggyPlugins/main/builds/TruePresence/` |
| FluidNavigation | `https://raw.githubusercontent.com/lmaohi7181828/ShiggyPlugins/main/builds/FluidNavigation/` |
| LiveThemeComposer | `https://raw.githubusercontent.com/lmaohi7181828/ShiggyPlugins/main/builds/LiveThemeComposer/` |

Or add the whole repo:
`https://raw.githubusercontent.com/lmaohi7181828/ShiggyPlugins/main/`

## Plugins

### CustomProfile v2.7.0
Local profile larp (identity, badges, nitro tenure, boost, connections).
- Configure from the plugin gear **or** Discord **Settings → Custom Profile** tab
- Hide real badges / connections, cycle Nitro + boost tiers live

### ShareX v1.2.0
ShareX `.sxcu` uploader with built-in commands:
- `/sharex-config` — option `sxcu` = full .sxcu JSON
- `/sharex-upload` — option `url` = image/file URL to rehost
- `/sharex-status` — show active uploader

### ShowBadgesInChat v1.2.0
Shows **classic + Nitro + boost + profile.badges** next to names in chat.
Enable **Emoji marks on names** for the most reliable mobile display. Reopen channel after enabling.

### TruePresence v1.2.0
Reveal offline/invisible users who are in voice, have activities, or active clients (local only).

### FluidNavigation v1.0.0
Configurable navigation motion system for Discord mobile screens.
- Transition styles: fade, horizontal/vertical slide, scale+fade, spring, minimal, none
- Duration, intensity, reduced-motion toggle
- Safe defaults for Android; never blocks navigation
- Settings screen with live controls and reset

### LiveThemeComposer v1.0.0
Mobile-first visual theme editor with live previews and safe theme management.
- Built-in presets: Midnight, OLED Black, Ocean, Lavender, Emerald, Warm Neutral, High Contrast
- Hex color controls + WCAG contrast warnings
- Save / rename / delete custom themes
- JSON export & validated import (no eval)
- Live preview of messages, buttons, surfaces

> Vibecoded w/ Grok <3

## Compatibility

These plugins target the **Vendetta-compatible plugin API** used by ShiggyCord (`vendetta.plugin.storage`, `vendetta.patcher`, `vendetta.metro`, etc.).

## Known limitations

- **FluidNavigation**: Full visual screen transitions depend on Discord’s internal navigation modules. The plugin safely hooks navigate events and provides configuration; deep transition replacement is best-effort and falls back to native behavior when modules are unavailable.
- **LiveThemeComposer**: Theme application is best-effort against the client’s color/token system. Not every native component is re-themeable. Contrast checks are advisory (WCAG relative luminance on the controlled color pairs only).

## Testing

See `tests/` for unit-style checks that can run under Node (mocked vendetta globals). Real-device verification requires a ShiggyCord install.
