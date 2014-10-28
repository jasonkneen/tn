# TiNy CLI [![Titanium](http://www-static.appcelerator.com/badges/titanium-git-badge-sq.png)](http://www.appcelerator.com/titanium/)

TiNy is a hook for the [Titanium CLI](http://docs.appcelerator.com/titanium/latest/#!/guide/Titanium_Command-Line_Interface_Reference)'s `build` command that allows you to do the same using less keystrokes. It has built-in recipes, but also allows you to compose and save your own recipes.

> **WARNING:** Version 2.0 is a complete rewrite with lots of breaking changes!

## Quick Start [![npm](http://img.shields.io/npm/v/tn.png)](https://www.npmjs.org/package/tn)

1. Install [TiNy](http://npmjs.org/package/tn) via [NPM](http://npmjs.org):

    ```
    sudo npm install -g tn --unsafe-perm
    ```
    
    You need `--unsafe-perm` to allow TiNy to hook into the Titanium CLI.
    
2. If for some reason hooking into the Titanium CLI still failed, use the TiNY CLI for this:

	```
	tn install
	```

3. Build a project to the iPad simulator using the built-in default `ipad` recipe:

	```
	ti --ipad
	```
	
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
	ti --ci "a great update"
	```

## Command aliases
New since 2.0.0 are command aliasses for all of the Titanium CLI's commands. A nice bonus so you can run `ti i` instead of `ti info`. If `ti` is followed by an option or flag TiNy assumes the `build` command so that `ti b --ipad` can be just `ti --ipad`.

alias|command
-----|-------
b|build
cl|clean
cf|config
cr|create
h|help
i|info
li|login
lo|logout
m|module
pl|plugin
pr|project
sd|sdk
su|setup
st|status

## Recipes
A recipe is simply a flag or option that stands for a group of other arguments, which may in turn include other recipes. There are built-in recipes, but you can also add your own or override built-ins.

* List all recipes: `tn list`

Colors will show you which recipes are built-in, user and user-overrides.

### Option recipes
Most recipes are flags, but a receipe can also be an option. If a recipe is followed by an argument value, TiNy assumes the recipe to be an option and replace any occurences of `%s` in the recipe with the value. See step 4 of the Quick Start for an example.

### Built-in recipes
These are the current built-in recipes. If you have handy custom recipes you think everybody should have, please send a PR or open a ticket to have them added to the built-ins.

* **NOTE:** Don't forget that since 2.0 you need `ti --[name]`.

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

#### Project recipes
Project recipes override both user and built-in recipes. The are stored in the current working directory in a file called `tn.json`. To edit this file instead of the global user file add `project` before the `save`, `rename`, `remove` and `reset` commands:

```
tn project save ios --target android # overrides the built-in (and custom) ios-recipe
tn project rename ios confusing      # restores the built-in (or custom) ios-recipe
tn project remove confusing          # deletes the confusing custom recipe
tn project reset                     # deletes the tn.json file
```

### Skip TiNy
Add `--skip` to skip TiNy's magic.

#### Verbose mode
If you want to know exactly what TiNy is doing, e.g. when you're composing a new recipe, you can enable verbose-mode by passing `--verbose` as one of the arguments. Apart from showing how TiNy cooks the end-result, it will also pause before actually executing it, asking if you want to save it as a recipe, just run it or exit.

### Resolving aliases
TiNy will convert abbreviations (`-T`) to their full names (`--target`). It needs to this for the next feature.

### Resolving duplicates
TiNy will resolve any duplicate options and flags in order of appearance. 

### Install & Uninstall
Two other commands only briefly mentioned in the Quick Start are for installing (`tn install`) and uninstalling (`tn uninstall`) TiNy as a hook for the Titanium CLI. These are executed automatically when you install or uninstall TiNy over NPM.

## Roadmap
* Restore some of the smarts lost in the 2.0 rewrite.
* Add more built-in recipes.

## Changelog
* 2.x: Rewrite using traditional flags/options format for recipes.
* 1.x: Rewrite dropping support for `T=emulator` and `T:emulator` notations.
* 0.x: Original version.

## Bugs
When you find issues, please [report](https://github.com/FokkeZB/gittio/issues) them. Be sure to include *all* of the output from the gittio command that didn't work as expected. Also please check if there's not already in issue for it.

## License

<pre>
Copyright 2013-2014 Fokke Zandbergen

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
