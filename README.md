# TiNy
## WARNING: UNDER HEAVY DEVELOPMENT
===============

TiNy is CLI wrapper for the official [Titanium](http://docs.appcelerator.com/titanium/latest/#!/guide/Titanium_Command-Line_Interface_Reference), [Alloy](http://docs.appcelerator.com/titanium/latest/#!/guide/Alloy_Command-Line_Interface_Reference) and related CLI's to make the world a better place by minimizing the amount of keyboard strokes per common task.

## Getting started

### Install from NPM
TiNy is built on [Node.js](http://nodejs.org/). Once you have Node.js installed you can use the included NPM package manager to install [TiNy](https://npmjs.org/package/tn) via the following command:

```
sudo npm install -g tn
```

### Arguments
Arguments can be set in any order. Only some arguments can or must be followed by a variable. Arguments can have a different, but always predictable meaning depending on the combination in which they are used.

Argument | Value | Description
------- | ----- | -----------
Method | Params | Description

### Combos

Combo | Result
----- | -----------
`tn` | `titanium build -p ios`
`tn android` | `titanium build -p android`
`tn android device` | `titanium build -p android -T device`
`tn geny` | ...

### Aliases
You can create an alias for a combo using the `alias:` argument, directly followed by a name. For example:

```
tn alias:crap android device
```

## Roadmap

* Add more built-in commands for common tasks.