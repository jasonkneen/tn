# TiNy CLI [![Titanium](http://www-static.appcelerator.com/badges/titanium-git-badge-sq.png)](http://www.appcelerator.com/titanium/)

TiNy is a wrapper for the [Appcelerator CLI](http://docs.appcelerator.com/platform/latest/#!/guide/Appcelerator_Command-Line_Interface_Reference)'s `run` and [Titanium CLI](http://docs.appcelerator.com/platform/latest/#!/guide/Titanium_Command-Line_Interface_Reference)'s `build` command that allows you to do the same using less keystrokes. It has built-in recipes, but also allows you to compose and save your own recipes.

> **WARNING:** Version 3.x is once again a wrapper like 1.x and no longer a hook as 2.x

## Quick Start [![npm](http://img.shields.io/npm/v/tn.png)](https://www.npmjs.org/package/tn)

1. Install [TiNy](http://npmjs.org/package/tn) via [NPM](http://npmjs.org):

    ```
    [sudo] npm install -g tn --unsafe-perm
    ```
    
    * You probably need `sudo` on Mac OS.
    * You need `--unsafe-perm` to allow TiNy to uninstall the 2.x hook if needed.
    
2. If for some reason uninstalling the 2.x hook failed, use the TiNY CLI to do so:

	```
	tn uninstall
	```

3. Generate recipes for all connected simulators, emulators and devices:

	```
	tn generate
	```

4. Build a project for iPhone 6 Simulator using the generated recipe:

	```
	tn iphone-6
	tn iphone-6 --another-recipe
	```
	
	* Notice that since 3.0 is no longer a hook and you ned `tn` instead of `ti`.
	* Notice that since 4.0 you no longer need `tn r` or `tn b`, just use `tn`.
	* Only the first recipe after `tn` does not need to start with `--`.
	* If the recipes does end up giving a command as first arg, it will default to `build`
	
4. Compose a custom recipes mixing others (`--ah`) and an option value (`%s`):

	```
	tn save ci \
	-b \
	--pp-uuid 37304C9F-B2E0-490A-9800-0448A33BECE9 \
	--distribution-name "Jeff Haynie (E8978765FC)" \
	--ah \
	--installr --installr-release-notes %s
	```
	
5. Ship it:
	
	```
	tn ci "a great update"
	```

## Recipes
A recipe is simply a flag or option that stands for a group of other arguments, which may in turn include other recipes. There are built-in recipes, but you can also add your own or override built-ins.

* List all recipes: `tn list`

Colors will show you which recipes are built-in, user and user-overrides.

### Option recipes
Most recipes are flags, but a receipe can also be an option. If a recipe is followed by an argument value, TiNy assumes the recipe to be an option and replace any occurences of `%s` in the recipe with the value. See step 4 of the Quick Start for an example.

### Built-in recipes
These are the current built-in recipes. If you have handy custom recipes you think everybody should have, please send a PR or open a ticket to have them added to the built-ins.

* Don't forget that since 2.0 recipes are options and start with `--`.
* Only the first recipe does not need to start with `--`.

|name|recipe|
|----|------|
|android|--platform android|
|blackberry|--platform blackberry|
|ios|--platform ios|
|mobileweb|--platform mobileweb|
|tizen|--platform tizen|
|ipad|--device-family ipad|
|iphone|--device-family iphone|
|ip|--iphone|
|universal|--device-family universal|
|uni|--universal|
|appstore|--ios --target dist-appstore|
|as|--appstore|
|playstore|--android --target dist-playstore|
|play|--playstore|
|ps|--playstore|
|distribute|--blackberry --target distribute|
|dist|--distribute|
|adhoc|--ios --target dist-adhoc|
|ah|--adhoc|
|emulator|--target emulator|
|emu|--emulator|
|simulator|--target simulator|
|sim|--simulator|
|device|--target device|
|ioses|--ios --device --device-id all|
|droid|--android --device|
|desktop|-output-dir ~/Desktop|
|ip7|--sim-version 7.1 --sim-type iphone|
|ip6|--sim-version 6.1 --sim-type iphone|
|ipad7|--sim-version 7.1 --sim-type ipad|
|ipad6|--sim-version 6.1 --sim-type ipad|
|key-password|--key-password %s --key-password %s --platform android|
|android-sdk|--android-sdk %s --platform android|
|avd-abi|--avd-abi %s --platform android|
|keystore|--keystore %s --platform android|
|alias|--alias %s --platform android|
|store-password|--store-password %s --platform android|
|avd-skin|--avd-skin %s --platform android|
|ip-address|--ip-address %s --platform blackberry|
|debug-token|--debug-token %s --platform blackberry|
|keystore-password|--keystore-password %s --platform blackberry|
|ndk|--ndk %s --platform blackberry|
|password|--password %s --platform blackberry|
|force-copy|--force-copy --platform ios|
|force-copy-all|--force-copy-all --platform ios|
|retina|--retina --platform ios|
|sim-64bit|--sim-64bit --platform ios|
|sim-focus|--sim-focus --platform ios|
|tall|--tall --retina --platform ios|
|device-family|--device-family %s --platform ios|
|ios-version|--ios-version %s --platform ios|
|pp-uuid|--pp-uuid %s --platform ios|
|distribution-name|--distribution-name %s --platform ios|
|sim-version|--sim-version %s --target simulator --platform ios|
|keychain|--keychain %s --platform ios|
|developer-name|--developer-name %s --target device --platform ios|
|sim-type|--sim-type %s --target simulator --platform ios|

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
  iphone-5s: --platform ios --target simulator --device-id 2592EB13-534C-4E05-8D58-110D0261BDE3
  iphone-5s-ios71: --platform ios --target simulator --device-id 2AE900F4-4349-4AD9-9AC4-CFD881BD5877
  iphone-fokke: --platform ios --target device --device-id daf492502fffe744842280370ed6dcc740eda657
  samsung-galaxy-s4-43-api-18-1080x1920: --platform android --target emulator --device-id "Samsung Galaxy S4 - 4.3 - API 18 - 1080x1920"
```

#### Project recipes
Project recipes override both user and built-in recipes. The are stored in the current working directory in a file called `tn.json`. To edit this file instead of the global user file add `project` before the `save`, `rename`, `remove` and `reset` commands:

```
tn project save ios --target android # overrides the built-in (and custom) ios-recipe
tn project rename ios confusing      # restores the built-in (or custom) ios-recipe
tn project remove confusing          # deletes the confusing custom recipe
tn project reset                     # deletes the tn.json file
```

#### Command recipes
Any recipe can be used as a command as well. Like the Quick Start shows you can do `tn ipad` instead of `tn --ipad`. If the first argument is a valid recipe name TiNy will turn it into a flag/option and continue as normal.

### Verbose mode
If you want to know exactly what TiNy is doing, e.g. when you're composing a new recipe, you can enable verbose-mode by passing `--verbose` as one of the arguments. Apart from showing how TiNy cooks the end-result, it will also pause before actually executing it, asking if you want to save it as a recipe, just run it or exit.

## Other features

### Resolving aliases
TiNy will convert abbreviations (`-T`) to their full names (`--target`). It needs to this for the next feature.

### Resolving duplicates
TiNy will resolve any duplicate options and flags in order of appearance. 

## Roadmap
* Restore some of the smarts lost in the 2.0 rewrite.
* Add more built-in recipes.

## Changelog
* 4.0.0: Removed the need to use `tn r` or `tn b` thanks to [appc-compat](https://npmjs.com/appc-compat)
* 3.0.0: Reverted TiNy from hook back to wrapper, supporting both `ti build` and `appc run`.
* 2.3.0: Fixes for TiNy not to mess when run via Studio or AppC CLI
* 2.2.0: Adds generating device/emulator/simulator recipes (`tn generate`).
* 2.1.0: Re-introduces command recipes (and fixes `postinstall` for `npm link`). 
* 2.0.0: Rewrite using traditional flags/options format for recipes.
* 1.0.0: Rewrite dropping support for `T=emulator` and `T:emulator` notations.
* 0.1.0: Original version.

## Bugs
When you find issues, please [report](https://github.com/FokkeZB/gittio/issues) them. Be sure to include *all* of the output from the gittio command that didn't work as expected. Also please check if there's not already in issue for it.

## License

<pre>
Copyright 2013-2015 Fokke Zandbergen

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
