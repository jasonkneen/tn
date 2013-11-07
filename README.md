# TiNy

TiNy is CLI wrapper for the official [Titanium](http://docs.appcelerator.com/titanium/latest/#!/guide/Titanium_Command-Line_Interface_Reference), [Alloy](http://docs.appcelerator.com/titanium/latest/#!/guide/Alloy_Command-Line_Interface_Reference) and related CLI's to make the world a better place by minimizing the amount of keyboard strokes per common task.

* Blogs on TiNy: [http://fokkezb.nl/tag/tiny/](http://fokkezb.nl/tag/tiny/)

[![NPM](https://nodei.co/npm/tn.png?downloads=true&starts=true)](https://nodei.co/npm/tn/)

## Quick Start

### Install from NPM
TiNy is built on [Node.js](http://nodejs.org/). Once you have Node.js installed you can use the included NPM package manager to install [TiNy](https://npmjs.org/package/tn) via the following command:

```
sudo npm install -g tn
```

### Install as Titanium CLI 3.2 hook
You can optionally run TiNy as an hook for the new Titanium CLI 3.2:

```
tn hook
```

After having done this, you can both use `tn` and `ti ny`. The latter will run as an hook under the Titanium CLI. Future versions of TiNy will use some of the benefits that come with running as an hook instead of stand-aline.

### Build an app
The default options for TiNy are set to execute `ti build` for iOS. So even without passing any argument, TiNy will build your app for iOS and launch it in the simulator:

```
$ tn
TiNy by Fokke Zandbergen <www.fokkezb.nl>
The simple CLI for Titanium, Alloy and related tools.

[INFO] Executing: ti build -p ios
...
```

Another example bulding an app for the App Store:

```
$ tn appstore 37304C9F-B2E0-490A-9800-0448A33BECE9 "Fokke Zandbergen (E8978765FC)"
```

Or using custom [recipes](#recipes):

```
$ tn myapp: 37304C9F-B2E0-490A-9800-0448A33BECE9
$ tn me: "Fokke Zandbergen (E8978765FC)"
$ tn ship-it: appstore myapp me

$ tn ship-it
```

## Arguments

### System arguments
Some arguments have to do with how TiNy works:

Argument(s) | Description
----------- | -----------
`v`, `version`, `-v` | Prints TiNy version. Must be first argument.
`recipes` | Prints system and user(overridden) recipes. Must be first argument.
`verbose` | Shows how recipes are expanded, shows the resulting command and asks if you want to execute it, save it as recipe or just exit.
`[my-recipe]:` | Sets or unsets an recipe. See [Recipes](#recipes).
`[new-recipe]:[old-recipe]` | Renames a recipe. See [Recipes](#recipes).

### Smart arguments
The best way to keep TiNy tiny is to guess the key by its value and to understand the relationship between arguments:

Argument | Param | Comments
-------- | ----- | --------
`android`, `ios`, `tizen`, `blackberry`, `mobileweb` | `-p [arg]` | Sets the platform. For `blackberry` it also defaults `-O ~/Desktop`.
`simulator`, `device`, `distribute`, `dist-playstore`, `dist-appstore`, `dist-adhoc` | `-T [arg]` | Sets the target and - if it's platform-specific - the platform. For `dist-playstore` and `dist-adhoc` it also defaults `-O ~/Desktop`.
`iphone`, `ipad`, `universal` | `-F [arg] -p ios` | Sets the device family, but also platform to `ios`
3.1.3.GA | `-s [arg]` | Sets the SDK version
37304C9F-b2e0-490A-9800-0448A33BECE9 | `-P [arg] -p ios` | Sets the provisioning profile UUID, platform to `ios` and defaults target to `dist-appstore`. May be entered lowercase as well!
Fokke Zandbergen `(`e8978765fcs`)` | `-R/V [arg]` | Sets the developer or distribution certificate name, depending on target. Also sets platform to `ios` and defaults target to `dist-appstore`. May be entered lowercase as well!
/path/to/my`.keystore` | `-K [arg]`| Sets the keystore, but also platform to `android`
/just/some`/`path | `-O [arg]` | Sets the output path, but only if an earlier argument has set the platform to `blackberry` or the target to `dist-playstore` or `dist-adhoc`

### Param arguments
If there's no smart argument for what you need, you can set any param on the executed command directly by using various available key-value notation styles:

```
$ tn -R "Fokke Zandbergen"
$ tn R="Fokke Zandbergen"
$ tn R:"Fokke Zandbergen"
$ tn --distribution-name FokkeZB
$ tn distribution-name=FokkeZB
$ tn distribution-name:FokkeZB
$ tn -retina
$ tn --retina
```

I prefer the `K=value` style since it takes the least keystrokes :)

## Recipes
Recipes are arguments that stand for one or more other arguments.

### Built-in system recipes
TiNy comes with a growing number of built-in recipes:

Recipe | Argument(s)
------ | -----------
`appstore` | `dist-appstore`
`playstore` | `dist-playstore`
`play` | `dist-playstore`
`dist` | `distribution`
`adhoc` | `dist-adhoc`
`desktop` | `~/Desktop`
`iphone7` | `S=7.0 Y=iphone`
`iphone6` | `S=6.1 Y=iphone`
`ipad7` | `S=7.0 Y=ipad`
`ipad6` | `S=6.1 Y=ipad`

### Custom user recipes
You can create a user recipes for one or combination of arguments by stating the name of the recipes as the first argument, followed by `:`. The following example lets you use `tn poop` to build an app for Google Play:

```
$ tn key: play ~/dev/.keystore
$ tn me: L=fokke
$ tn pass: P=iloveti
$ tn poop: pass me key
```

The user recipes are stored in `~/.tn.json`.

#### Overriding built-ins
You can also use the name of a system recipes for your custom one. This lets you override the built-in recipes. To restore, simply unset your custom recipes.

#### Using verbose
You can add `verbose` to see exactly what happends and what the final command is, before actually executing it or saving it as a recipe.

#### Renaming recipes
You can rename an existing user recipe like this:

```
$ tn old-name:new-name
```

#### Loops
As you can see recipes can also use other recipes. Whenever you use an recipes, TiNy automagically prevents you from getting into a loop.

## Roadmap

* Rewrite mapping of arguments to options/params internally.
* Support more `ti` commands and the `alloy` CLI as well.
* Support combining commands: `tn compile run` (compile Alloy and run TiShadow)
* Add more smart arguments.
* Add more built-in recipes.
* Come up with more crappy Android recipes :)

## Thanks to

* [tonylukasavage](https://github.com/tonylukasavage) for the [logger](https://github.com/appcelerator/alloy/blob/master/Alloy/logger.js)
* [rborn](https://github.com/rborn) for inspiring me with [SugarTi](https://github.com/rborn/SugarTi)
* [dbankier](https://github.com/dbankier) for learning by contributing to [TiShadow](https://github.com/dbankier/TiShadow)
* Google for learning NodeJS CLIs
* TiNy for being cute
* Coffee

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
