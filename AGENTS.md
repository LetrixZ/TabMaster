# TabMaster

> TabMaster is a Decky Loader plugin for Steam Deck that customizes Steam Library tabs: users can add filtered tabs, hide and reorder tabs, and organize tabs with profiles and sub-tabs.

This repository contains a React/TypeScript frontend bundled for Decky and a Python backend for settings persistence and plugin operations. It is a Steam client plugin, not a standalone web application. The frontend uses Decky APIs and Steam client stores, including some private or undocumented Steam UI internals.

## Project documentation

- [README](README.md): plugin features, installation, and end-user overview.
- [Contributor guidelines](Contributing.md): coding conventions, editor setup, commit messages, and pull requests.
- [In-app documentation](src/components/docs/plugin-docs/Overview.md): user-facing docs rendered inside the plugin. Related pages are in the same directory.
- [Plugin metadata](plugin.json): Decky plugin name, API version, and store description.
- [Package scripts and dependencies](package.json): build/watch scripts and project dependencies.

## Architecture

- [Frontend entry point](src/index.tsx) registers the plugin, initializes services after Steam login, mounts the Quick Access Menu UI, registers the in-app docs route, and installs/removes library and settings patches.
- [PluginController](src/lib/controllers/PluginController.tsx) coordinates login, Steam service startup, legacy settings migration, and plugin cleanup.
- [TabMasterManager](src/state/TabMasterManager.tsx) is the core state manager. It loads and saves tabs, tracks visible and hidden tabs, reacts to Steam store changes, rebuilds custom-tab collections, and notifies the UI/library patch when state changes.
- [CustomTabContainer](src/state/CustomTabContainer.tsx) represents a user-defined tab, evaluates its filters against Steam apps, and adapts it to Steam's library tab format.
- [Filter definitions and evaluation](src/components/filters/Filters.tsx) define filter types, parameter shapes, defaults, validation, and matching logic. Nested `merge` filters are supported.
- [Library patch](src/patches/LibraryPatch.tsx) adapts Steam's `/library` route to display TabMaster's tabs. [Settings patch](src/patches/SettingsPatch.tsx) integrates with Steam settings for managing hidden content.
- [PythonInterop](src/lib/controllers/PythonInterop.ts) is the frontend/backend bridge. Its Decky `call()` method names must match methods on the Python plugin class in [main.py](main.py).
- [Tab and filter types](src/types/tabs.d.ts) and [filter-related shared types](src/types/filters.d.ts) supplement the Steam/Decky declarations under `src/types/`.
- [In-app docs router](src/components/docs/DocsRouter.tsx) and [docs code generator](src/components/docs/docs.codegen) bundle Markdown from `src/components/docs/plugin-docs/` into the frontend.

## Sub-tabs (fork feature)

Sub-tabs are child custom tabs displayed inside a custom parent tab's content; they are not additional top-level Steam library tabs. A parent with children renders a horizontal sub-tab row. `All` selects the parent's own collection, and each named entry selects that child's collection. The child collection is built from the child's own included categories and filters; it is not implicitly intersected with the parent collection. Each child also has its own filter logic, category bit field, sort override, and other custom-tab settings.

### User-facing behavior

- A sub-tab can only be added to a custom tab. In the library's TabMaster context menu, choose `Add Sub-Tab`; this creates one immediately with a default Favorites collection filter and Games category. Or edit an existing custom parent and use its `Sub-Tabs` section to add, edit, or delete children. That editor path creates a child with no filters initially; open its edit control and add at least one valid filter before saving.
- Children are managed from the parent's edit modal, not from their own top-level Steam tab menu. Editing a child suppresses the `Sub-Tabs` section, so the UI supports one level of parent/child tabs, not nested sub-tabs.
- The sub-tab row includes an app count for each child. The left/right trigger buttons (L2/R2) move between `All` and child entries and clamp at either end rather than wrapping. Selection is remembered per parent in module memory for the current plugin session; it is not part of saved settings.
- The current parent editor offers add/edit/delete controls, but no reorder control. The order is the order of child IDs in the parent's `subTabs` array; `TabMasterManager.reorderSubTabs()` exists for code paths that need to change it.

### Data model and implementation

- Parent and child are separate `CustomTabContainer` entries in `TabMasterManager.tabsMap` and separate records in the saved tabs dictionary. The parent stores ordered child IDs in `subTabs`; each child stores the parent's ID in `parentId` and has `position: -1`, so it has no top-level visible position. These fields are declared in [tabs.d.ts](src/types/tabs.d.ts) and serialized/deserialized by `TabMasterManager.saveTabs()` and `finishLoadingTabs()`. **Important current edge case:** generic `finishLoadingTabs()` and `rebuildTabLists()` put every negative-position entry in `hiddenTabsList`, including persisted sub-tabs. When changing root-tab hide/unhide or load logic, distinguish children by `parentId` so they are not surfaced as ordinary hidden top-level tabs.
- `TabMasterManager.createSubTab()` creates the child, adds its ID to the parent's `subTabs`, and saves. `getSubTabs()` resolves IDs in that order. Deleting a parent deletes its listed children; deleting a child removes its ID from the parent's list. Updates use `updateCustomTab()`. The general Steam collection-change path (`rebuildCustomTabs()`) also rebuilds children of visible parents; specialized refresh handlers do not all traverse children, so include sub-tabs when adding or changing refresh behavior for filters such as achievements, install folder, or time-based filters.
- [EditTabModal.tsx](src/components/modals/EditTabModal.tsx) implements the parent's child-management panel and child editor. [LibraryMenu.tsx](src/components/context-menus/LibraryMenu.tsx) provides the quick `Add Sub-Tab` action. [LibraryPatch.tsx](src/patches/LibraryPatch.tsx) wraps parent content with sub-tab selection and renders the selected parent/child app grid; [SubTabBar.tsx](src/components/other/SubTabBar.tsx) implements the row and gamepad navigation. [CustomTabContainer.tsx](src/state/CustomTabContainer.tsx) builds each tab's collection independently.

When changing sub-tabs, preserve the parent/child ID relationship and saved settings shape, and check both creation paths, editing/deletion, reload persistence, collection refreshes, and selection/rendering. Since children are not root tabs, do not add them to the main visible-tab ordering as part of routine sub-tab changes.

## Settings and compatibility

The Python backend stores settings through Decky's `SettingsManager`. Tab state is user-specific; backend data also includes friends, friends' games, tags, and tab profiles. Preserve compatibility with existing saved settings when changing serialized structures. Inspect the migration and validation paths before changing those structures.

Steam store globals and library component internals are supplied by Steam at runtime, not implemented in this repository. Their local declarations are in `src/types/`. Keep runtime compatibility in mind when changing patches, and handle a missing or changed Steam element without assuming that undocumented internals are stable. The `sd card` filter depends on the optional MicroSDeck plugin; its integration is in `src/lib/controllers/MicroSDeckInterop.ts`.

## Development

- Install dependencies using the pnpm lockfile: `pnpm install`.
- Build the frontend bundle: `pnpm run build` (Rollup output goes to `dist/`).
- Rebuild on source changes: `pnpm run watch`.
- There is no configured automated test suite: the `test` script in `package.json` is a placeholder that exits with an error. Do not report it as a passing test.
- `build.sh` is a device-packaging/deployment script, not a routine build check. It stages a ZIP, removes/recreates build outputs, and runs `scp` to the configured `deck` host; inspect it and confirm deployment is intended before running it.

## Change guidance

- Follow [Contributor guidelines](Contributing.md) and match the style of the file being changed.
- When adding a filter, update the filter type/parameter mapping, defaults, description and icon maps, validation/inversion behavior as appropriate, evaluator, and UI components that expose its options. Check recursive `merge` handling as well.
- Keep frontend bridge calls and Python method names/argument shapes synchronized. Handle bridge errors and preserve settings compatibility.
- For UI changes, use the Decky/Steam UI patterns already present and consider controller/gamepad navigation.
- When changing in-app documentation, edit the source Markdown. `docs.codegen` collects those files at bundle time; the docs router currently expects the established page names.

## Key source directories

- `src/components/`: Quick Access Menu, filters, dialogs, context menus, and in-app docs.
- `src/state/`: tab manager, tab containers, profiles, and React context.
- `src/lib/controllers/`: Decky/Python bridge and integrations with Steam, MicroSDeck, logging, and errors.
- `src/patches/`: patches to Steam library and settings routes.
- `src/types/`: local TypeScript declarations for Decky and Steam client APIs.
- `src/presets/`: built-in custom-tab presets.
