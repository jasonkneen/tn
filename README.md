# TiNy CLI [![Titanium](http://www-static.appcelerator.com/badges/titanium-git-badge-sq.png)](http://www.appcelerator.com/titanium/)

TiNy is a hook for the [Titanium CLI](http://docs.appcelerator.com/titanium/latest/#!/guide/Titanium_Command-Line_Interface_Reference)'s `build` command that allows you to do the same using less keystrokes. It has built-in smarts (magic ingredients)and aliasses (recipes), but also allows you to compose and save your own recipes.

**WARNING:** Version 1.0 is a complete rewrite with lots of breaking changes!

* Blogs on TiNy: [http://fokkezb.nl/tag/tiny/](http://fokkezb.nl/tag/tiny/)

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

3. Build a project to the iPad simulator using the built-in default `ios` recipe:

	```
	ti build ipad
	```
	
	Or save 6 more keystrokes via the TiNy CLI. As long as the first argument doesn't match a TiNy CLI command it will pass any args on to `ti build`.
	
	```
	tn ipad
	```
	
4. Compose custom recipes and use magic ingredients:

	```
	tn save ship-my-app 37304C9F-B2E0-490A-9800-0448A33BECE9 "Fokke Zandbergen (E8978765FC)"
	```
	
	And build a new version as easy as:
	
	```
	ti build ship-my-app
	```


## Magic ingredients
A magic ingredient allows you to set multiple options by recognizing characteristics of one of its values.

### Provisioning Profile & Distribution Certificate
An argument matching `/^[0-9A-Z]{8}-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{12}$/i` will be recognized and upper-cased as a value for the `pp-uuid` option.

An argument matching `/^.+ \([0-9A-Z]{10}\)$/i` will be recognized and upper-cased as a value for either the `developer-name` or `distribution-name` option, depending on the `target` option, set either before or after.

Both magic ingredients will also set `--platform ios` and `--target dist-appstore`, unless any other argument explicitely sets a different value.

#### Before:

```
ti build -p ios -T dist-appstore --pp-uid 37304C9F-B2E0-490A-9800-0448A33BECE9 --distribution-name "Fokke Zandbergen (E8978765FC)"
```

#### After
```
ti build 37304C9F-B2E0-490A-9800-0448A33BECE9 "Fokke Zandbergen (E8978765FC)"
```

or

```
tn 37304C9F-B2E0-490A-9800-0448A33BECE9 "Fokke Zandbergen (E8978765FC)"
```

### SDK version
An argument matching `/^[0-9]\.[0-9]\.[0-9]/` will be recognized as a value for the `sdk` option. If you don't pass an SDK version you will still see it in the final arguments as the Titanium CLI will always insert the default SDK version.

### Keystore
An argument matching `/\.keystore$/` will be recognized as a value for the `keystore` option. This will also set `--platform android` and `--target dist-playstore` unless any other arguments explicitly sets a different value.

## Recipes
A recipe is simply an argument that stands for a group of other arguments, which may also include other recipes. There are built-in recipes, but you can also add your own or override built-ins.

* List all recipes: `tn list`

Colors will show you which recipes are built-in, user and user-overrides.

### Built-ins
These are the current built-in recipes. In **bold** are recipes used within other recipes.

* Build to iOS Simulator for iPad running 6.1: `ti build ipad6`

If you have handy custom recipes you think everybody should have, please send a PR or open a ticket to have them added to the built-ins.

|name|recipe|
|----|------|
|android|--platform android|
|blackberry|--platform blackberry|
|ios|--platform ios|
|mobileweb|--platform mobileweb|
|tizen|--platform tizen|
|ipad|--device-family ipad|
|iphone|--device-family iphone|
|ip|**iphone**|
|universal|--device-family universal|
|uni|**universal**|
|appstore|**ios** --target dist-appstore|
|as|**appstore**|
|playstore|**android** --target dist-playstore|
|play|**playstore**|
|ps|**playstore**|
|distribute|**blackberry** --target distribute|
|dist|**distribute**|
|adhoc|**ios** --target dist-adhoc|
|ah|**adhoc**|
|emulator|--target emulator|
|emu|**emulator**|
|simulator|--target simulator|
|sim|**simulator**|
|device|--target device|
|ioses|**ios** **device** --device-id all|
|droid|**android** **device**|
|desktop|-output-dir ~/Desktop|
|ip7|--sim-version 7.0 --sim-type iphone|
|ip6|--sim-version 6.1 --sim-type iphone|
|ipad7|--sim-version 7.0 --sim-type ipad|
|ipad6|--sim-version 6.1 --sim-type ipad|

### Default recipe
As you saw in the *Quick Start*, you can build for ios using just `ti build` or `tn`. This is because out of the box the `ios` built-in recipe is always prepended to the input arguments. You can change the default recipe using the CLI:

```
tn default android device
```

### Custom recipes

The user recipes are stored in `~/.tn.json` and override built-in recipes sharing the same name. Use the TiNy CLI to edit them:

```
tn save ios --target android # overrides the built-in 'ios'
tn rename ios confusing      # 'ios' will point to built-in again
tn remove confusing
tn reset                     # deletes the ~/.tn.json file
```

#### Project recipes
Project recipes override both user and built-in recipes. The are stored in the current working directory in a file called `tn.json`. To edit this file instead of the global user file add `project` before the `save`, `rename`, `remove` and `reset` commands:

```
tn project save ios --target android # overrides the built-in and if exists user 'ios'
tn project rename ios confusing      # 'ios' will point to built-in or if exists user again
tn project remove confusing
tn project reset                     # deletes the tn.json file
```

### Skip TiNy
Add `skip` as one of the arguments to have to skip TiNy and just have `ti build` continue as it were.

#### Verbose mode
If you want to know exactly what TiNy is doing, e.g. when you're composing a new recipe, you can enable verbose-mode by passing `verbose` as one of the arguments. Apart from showing how TiNy cooks the end-result, it will also pause before actually executing it, asking if you want to save it as a recipe, just run it or exit.

## Titanium options & flags
As a CLI hook TiNy knows all about the available options and flags for the specific SDK you're building against, including any options of other plug-ins. It uses this information to tell if an argument is an option or a flag, but that's not all.

### Long names
TiNy will also convert option abbreviations (`-T`)to long names (`--target`). It needs to do this to not end up with both `-T` and `--target` if a magic ingredient or recipe sets the same option.

### Implicit platform
If an argument is found to apply to only one platform, it will automatically also set the `platform` option itself. This enables you to do `ti build --device-family ipad`.

### Output dir
If `--target` is set to `dist-adhoc` and no `--output-dir` is given, then the default `{CWD}/dist` will be set.

## TiNy CLI
As shown you can use the TiNy CLI as an alias for `ti build`. Because of the default recipe executing `tn` will not give you help. For this you will need to explicitely run `tn -h`.

The help will show you the commands available, mainly for dealing with user recipes like described above.

### Reset
A command we haven't talked about yet it `tn reset`. This will simply delete `~/.tn.json` restoring all built-in recipes.

### Install & Uninstall
Two other commands only briefly mentioned in the Quick Start are for installing (`tn install`) and uninstalling (`tn uninstall`) TiNy as a hook for the Titanium CLI. These are executed automatically when you install or uninstall TiNy over NPM.

## Breaking changes in 1.0
Version 1.x is a complete re-write of TiNy, breaking:

* No more support for `T=emulator` and `T:emulator` option+value notation.
* No more magic ingredient for the `output` option.

## Bugs
When you find issues, please [report](https://github.com/FokkeZB/gittio/issues) them. Be sure to include *all* of the output from the gittio command that didn't work as expected. Also please check if there's not already in issue for it.

## Roadmap
* No longer need long names by checking both abbreviated and long name when setting an argument from a recipe or magic ingredient.
* Add more magic ingredients.
* Add more built-in recipes.

## License

<pre>
Copyright 2013 Fokke Zandbergen

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
