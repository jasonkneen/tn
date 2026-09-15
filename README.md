# TiNy CLI

TiNy is a CLI wrapper for [Titanium SDK](https://titaniumsdk.com) that lets you build iOS and Android apps with fewer keystrokes. It ships with built-in recipes for common build configurations and lets you compose and save your own.

Version 5.4.1 requires Node.js 18+ and targets iOS and Android only.

## Quick Start [![npm](http://img.shields.io/npm/v/tn.png)](https://www.npmjs.org/package/tn)

1. Install [TiNy](http://npmjs.org/package/tn) via [NPM](http://npmjs.org):

   ```bash
   npm install -g tn
   ```

   **Requirements:**
   - Node.js 18+ (Titanium CLI requires Node.js 20.18.1+)
   - Titanium CLI installed: `npm install -g titanium`
   - Titanium SDK: `ti sdk install latest`
   - iOS Simulator (for iOS development)
   - Android SDK and emulators (for Android development)

2. If for some reason uninstalling the 2.x hook failed, use the TiNY CLI to do so:

   ```
   tn uninstall
   ```

3. Generate recipes for all connected simulators, emulators and devices:

   ```
   tn generate
   ```

4. Build a project using generated device recipes:

   ```
   tn iphone-16-pro
   tn pixel-8-pro-api-34 --another-recipe
   ```

   - TiNy is a CLI wrapper that executes `ti build` commands
   - The first recipe after `tn` does not need to start with `--`
   - Multiple recipes can be combined in a single command
   - All commands default to `build` operation

5. Compose a custom recipes mixing others (`--ah`) and an option value (`%s`):

   ```
   tn save ci \
   -b \
   --pp-uuid 37304C9F-B2E0-490A-9800-0448A33BECE9 \
   --distribution-name "Jeff Haynie (E8978765FC)" \
   --ah \
   --installr --installr-release-notes %s
   ```

6. Ship it:

   ```
   tn ci "a great update"
   ```

## Recipes

A recipe is simply a flag or option that stands for a group of other arguments, which may in turn include other recipes. There are built-in recipes, but you can also add your own or override built-ins.

- List all recipes: `tn list`

Colors will show you which recipes are built-in, user and user-overrides.

### Option recipes

Most recipes are flags, but a recipe can also be an option. If a recipe is followed by an argument value, TiNy assumes the recipe to be an option and replace any occurrences of `%s` in the recipe with the value. See step 4 of the Quick Start for an example.

### Built-in recipes

The built-in recipes cover the most common build configurations. A few things worth knowing:

- Recipes expand to full Titanium CLI arguments
- The first recipe in a command doesn't need the `--` prefix
- Multiple recipes can be combined in a single command

**Apple / iOS**

| name      | recipe                        |
| --------- | ----------------------------- |
| ios       | --platform ios                |
| ip        | --iphone                      |
| ipad      | --device-family ipad          |
| iphone    | --device-family iphone        |
| mac       | --platform ios --target macos |
| catalyst  | --mac                         |
| sim       | --simulator                   |
| simulator | --target simulator            |
| uni       | --universal                   |
| universal | --device-family universal     |
| watch     | --ios --launch-watch-app      |

**Android**

| name     | recipe             |
| -------- | ------------------ |
| android  | --platform android |
| droid    | --android --device |
| emu      | --emulator         |
| emulator | --target emulator  |

**Distribution**

| name      | recipe                            |
| --------- | --------------------------------- |
| appstore  | --ios --target dist-appstore      |
| as        | --appstore                        |
| macstore  | --ios --target dist-macappstore   |
| adhoc     | --ios --target dist-adhoc         |
| ah        | --adhoc                           |
| playstore | --android --target dist-playstore |
| play      | --playstore                       |
| ps        | --playstore                       |

**iOS Devices**

| name  | recipe                         |
| ----- | ------------------------------ |
| ioses | --ios --device --device-id all |

**Aliases**

Short forms for commonly used recipes. Each alias expands to a single flag that maps to an existing recipe.

| alias    | expands to |
| -------- | ---------- |
| ah       | adhoc      |
| as       | appstore   |
| catalyst | mac        |
| emu      | emulator   |
| ip       | iphone     |
| play     | playstore  |
| ps       | playstore  |
| sim      | simulator  |
| uni      | universal  |

**Misc**

| name    | recipe                |
| ------- | --------------------- |
| desktop | -output-dir ~/Desktop |
| device  | --target device       |

**Parametric recipes (iOS)**

These recipes accept a value that replaces `%s` in the expanded command. Useful when composing custom recipes with `tn save`.

| name              | recipe                                             | description                                                         |
| ----------------- | -------------------------------------------------- | ------------------------------------------------------------------- |
| device-family     | --device-family %s --platform ios                  | Target device family: `iphone`, `ipad`, or `universal`              |
| developer-name    | --developer-name %s --target device --platform ios | Developer certificate name for device builds (e.g. `"John (T3AM)"`) |
| distribution-name | --distribution-name %s --platform ios              | Distribution certificate name for App Store or Ad Hoc signing       |
| ios-version       | --ios-version %s --platform ios                    | Target iOS SDK version (e.g. `18.0`)                                |
| keychain          | --keychain %s --platform ios                       | Path to the macOS keychain file containing signing certificates     |
| pp-uuid           | --pp-uuid %s --platform ios                        | Provisioning Profile UUID for app signing                           |
| sim-type          | --sim-type %s --target simulator --platform ios    | Simulator type: `iphone` or `ipad`                                  |
| sim-version       | --sim-version %s --target simulator --platform ios | iOS version of the simulator to target (e.g. `18.6`)                |

**Parametric recipes (Android)**

| name           | recipe                                 | description                                                          |
| -------------- | -------------------------------------- | -------------------------------------------------------------------- |
| alias          | --alias %s --platform android          | Keystore entry alias (the name given when the key was created)       |
| android-sdk    | --android-sdk %s --platform android    | Override the path to the Android SDK installation                    |
| avd-abi        | --avd-abi %s --platform android        | ABI architecture of the emulator (e.g. `x86_64`, `arm64-v8a`)        |
| key-password   | --key-password %s --platform android   | Password for the signing key inside the keystore                     |
| keystore       | --keystore %s --platform android       | Path to the `.keystore` file used to sign the APK/AAB                |
| store-password | --store-password %s --platform android | Password for the keystore file itself (distinct from `key-password`) |

### Custom recipes

The user recipes are stored in `~/.tn.json` and override built-in recipes sharing the same name. Use the TiNy CLI to edit them:

```
tn save ios --target android # overrides the built-in ios-recipe
tn rename ios confusing      # restores the built-in ios-recipe
tn remove confusing          # deletes the confusing custom recipe
tn reset                     # deletes the ~/.tn.json file
```

##### Generating Device/Emulator/Simulator recipes

You can generate user recipes for all connected devices, emulators and simulators by running `tn generate`. This will automatically create new recipes like:

```
  iphone-16-pro: --platform ios --target simulator --device-id 846AD047-0AE2-4778-A4B0-C28206B9BDBB
  iphone-16-pro-max: --platform ios --target simulator --device-id 44AB80FA-A529-47F9-9C53-05DA319D7C6D
  ipad-air-13-inch-m3: --platform ios --target simulator --device-id CE9F76E4-FF32-4E99-9005-71F69BDE01C1
  pixel-8-pro-api-34: --platform android --target emulator --device-id "Pixel 8 Pro API 34"
```

If `tn generate` finds user recipes pointing to iOS simulators or Android emulators that are no longer installed (e.g. after uninstalling an iOS Simulator runtime in Xcode), it lists them and asks whether to remove them. Physical device recipes are never touched.

##### Cleaning up simulators

Xcode does not clean up after itself. Uninstall an iOS runtime and its simulators stay in `~/Library/Developer/CoreSimulator/Devices` forever: they still show up in `simctl list`, they can never be booted again, and they can easily take tens of gigabytes.

`tn clean` deletes them:

```bash
tn clean                    # delete simulators whose runtime is gone
tn clean --data             # erase contents and settings, keep the simulators
tn clean --runtimes         # delete installed runtimes you pick from a list
tn clean --data --runtimes  # flags combine
```

With no flags it only removes the unusable ones, which is always safe. Every operation lists what it found, shows how much disk space it would free, and asks before deleting anything — the prompt defaults to no.

`--data` deletes the apps installed in each simulator and their data, keeping the simulators themselves. Booted simulators are skipped.

`--runtimes` lets you pick which runtimes to delete, with their size and last use date shown, and warns you if you pick the newest one you have. Deleting a runtime makes its simulators unusable, so those are removed in the same run and any recipes left pointing at them are offered for removal.

`tn generate` reports leftover simulators when it finds them, so you know they are there:

```
[WARN]  11 ghost simulators found — their runtime is no longer installed
        Run  tn clean  to remove them and free up disk space.
```

Android emulators are not touched by `tn clean`.

#### Project recipes

Project recipes override both user and built-in recipes. The are stored in the current working directory in a file called `tn.json`. To edit this file instead of the global user file add `project` before the `save`, `rename`, `remove` and `reset` commands:

```
tn project save ios --target android # overrides the built-in (and custom) ios-recipe
tn project rename ios confusing      # restores the built-in (or custom) ios-recipe
tn project remove confusing          # deletes the confusing custom recipe
tn project reset                     # deletes the tn.json file
```

##### Command recipes

Any recipe can be used as a command as well. Like the Quick Start shows you can do `tn ipad` instead of `tn --ipad`. If the first argument is a valid recipe name TiNy will turn it into a flag/option and continue as normal.

### Verbose mode

Enable verbose mode to see exactly how TiNy processes your recipes:

```bash
tn ios --verbose
tn iphone-16-pro --distribution-name "My Company" --verbose
```

Verbose mode shows:

- Recipe expansion step-by-step
- Duplicate option resolution
- Final command that will be executed
- Interactive prompts to save, execute, or exit

## Common Usage Examples

### iOS Development

```bash
# Build for iOS simulator
tn ios
tn iphone-16-pro

# Build for App Store distribution
tn appstore --distribution-name "Your Company"

# Build with specific provisioning profile
tn ios --pp-uuid "37304C9F-B2E0-490A-9800-0448A33BECE9"
```

### Android Development

```bash
# Build for Android emulator
tn android
tn pixel-8-pro-api-34

# Build for Play Store distribution
tn playstore --keystore path/to/keystore --alias myalias

# Build with specific Android SDK
tn android --android-sdk /path/to/android/sdk
```

### Custom Workflows

```bash
# Create and use custom recipes
tn save my-debug --ios --simulator --device-family universal
tn my-debug

# Project-specific recipes
tn project save release --playstore --keystore ./android/release.keystore
tn release
```

## Other features

### Resolving aliases

TiNy converts abbreviations (`-T`) to their full names (`--target`) to support duplicate resolution.

### Resolving duplicates

TiNy will resolve any duplicate options and flags in order of appearance.

## Features

### Changes in v5.0.0

- Requires Node.js 18+ (Titanium CLI needs 20.18.1+)
- Switched to lodash, chalk, and @inquirer/prompts
- Dropped support for platforms other than iOS and Android
- Added ESLint 8 and Prettier

### Device management

`tn generate` detects all connected iOS simulators, Android emulators, and physical devices and writes a recipe for each. Supports current hardware including iPhone 16 series, iPad Air M3, iPad Pro M4, and recent Android emulators.

### Recipe system

Ships with 40+ built-in recipes. Save your own with `tn save`, keep per-project recipes in `tn.json`, and chain multiple recipes in a single command.

### Other

- `--verbose` shows each expansion step and the final command before running
- Interactive prompts let you save or cancel before executing
- Safety checks prevent accidental deletion of recipe files
- Uses Titanium SDK CLI (`ti`) exclusively

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for detailed version history and breaking changes.

## Bugs

When you find issues, please [report](https://github.com/jasonkneen/tn/issues) them. Be sure to include:

- Complete command output
- Your environment details (Node.js version, OS, Titanium SDK version)
- Steps to reproduce the issue

Check existing issues first to avoid duplicates.

## License

<pre>
Copyright (c) 2016-2021, Jason Kneen.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
</pre>
