# TiNy

TiNy is CLI wrapper for the official [Titanium](http://docs.appcelerator.com/titanium/latest/#!/guide/Titanium_Command-Line_Interface_Reference), [Alloy](http://docs.appcelerator.com/titanium/latest/#!/guide/Alloy_Command-Line_Interface_Reference) and related CLI's to make the world a better place by minimizing the amount of keyboard strokes per common task.

## Quick Start

### Install from NPM
TiNy is built on [Node.js](http://nodejs.org/). Once you have Node.js installed you can use the included NPM package manager to install [TiNy](https://npmjs.org/package/tn) via the following command:

```
sudo npm install -g tn
```

### Build an app for iOS
The default options for TiNy are set to execute `ti build` for iOS. So even without passing any argument, TiNy will build your app for iOS and launch it in the simulator:

```
$ tn
TiNy by Fokke Zandbergen <www.fokkezb.nl>
The simple CLI for Titanium, Alloy and related tools.

[INFO] Executing: ti build -p ios
...
```

## Arguments

### System arguments
Some arguments have to do with how TiNy works:

Argument(s) | Description
----------- | -----------
`v`, `version`, `-v` | Prints TiNy version. Must be first argument.
`aliases` | Prints system and user(overridden) aliases. Must be first argument.
`debug` | Doesn't execute final command, only prints it.
`[a-z]+:` | Sets or unsets an alias, see [Aliases](#aliases).

### Smart arguments
The best way to keep TiNy tiny is to guess the key by its value and to understand the relationship between arguments:

Argument | Param | Comments
-------- | ----- | --------
`android`, `ios`, `tizen`, `blackberry`, `mobileweb` | `-p [arg]` | Sets the platform. For `blackberry` it also defaults `-O ~/Desktop`.
`simulator`, `device`, `distribute`, `dist-playstore`, `dist-appstore`, `dist-adhoc` | `-T [arg]` | Sets the target and - if it's platform-specific - the platform. For `dist-playstore` and `dist-adhoc` it also defaults `-O ~/Desktop`.
`iphone`, `ipad`, `universal` | `-F [arg] -p ios` | Sets the device family, but also platform to `ios`
3.1.3.GA | `-s [arg]` | Sets the SDK version
37304C9F-B2E0-490A-9800-0448A33BECE9 | `-P [arg] -p ios` | Sets the provisioning profile UUID, but also platform to `ios`
/path/to/my`.keystore` | `-K [arg]`| Sets the keystore, but also platform to `android`
/just/some`/`path | `-O [arg]` | Sets the output path, but only if an earlier argument has set the platform to `blackberry` or the target to `dist-playstore` or `dist-adhoc`

### Param arguments
If there's no smart argument for what you need, you can set any param on the executed command directly by using various available key-value notation styles:

```
tn -R "Fokke Zandbergen"
tn R="Fokke Zandbergen"
tn R:"Fokke Zandbergen"
tn --distribution-name FokkeZB
tn distribution-name=FokkeZB
tn distribution-name:FokkeZB
tn -retina
tn --retina
```

I prefer the `K=value` style since it takes the least keystrokes :)

## Aliases
Aliases are arguments that stand for one or more other arguments. By defining custom aliases you could build a certain app for the App Store by simply calling:

```
tn shipit
```

### Built-in system aliases
TiNy comes with a growing number of built-in aliases:

Alias | Argument(s)
----- | -----------
`appstore` | `dist-appstore`
`playstore` | `dist-playstore`
`play` | `dist-playstore`
`dist` | `distribution`
`adhoc` | `dist-adhoc`
`desktop` | `~/Desktop`

### Custom user aliases
You can create a user alias for one or combination of arguments by stating the name of the alias as the first argument, followed by `:`. The following example lets you use `tn poop` to build an app for Google Play:

```
tn key: play ~/dev/.keystore
tn me: L=fokke
tn pass: P=iloveti
tn poop: pass me key
```

The user aliases are stored in `~/.tn.json`.

#### Loops
As you can see aliases can also use other aliases. Whenever you use an alias, TiNy automagically prevents you from getting into a loop.

#### Overriding built-ins
You can also use the name of a system alias for your custom one. This lets you override the built-in alias. To restore, simply unset your custom alias.

## Roadmap

* Support more `ti` commands and the `alloy` CLI as well.
* Support combining commands: `tn compile run` (compile Alloy and run TiShadow)
* Add more smart arguments.
* Add more built-in aliases.
* Come up with more crappy Android aliases :)

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
