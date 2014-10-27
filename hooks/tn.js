'use strict';

var _ = require('underscore'),
  updateNotifier = require('update-notifier');

var pkg = require('../package.json'),
  kitchen = require('../lib/kitchen');

exports.cliVersion = '>=3.2';

exports.init = function(logger, config, cli, nodeappc) { // jshint unused:false
  var ingredients, tray;

  // take args from command on
  ingredients = process.argv.slice(2);

  // let the kitchen cook
  tray = kitchen.cook(ingredients, {
    cli: true
  });

  // nothing served
  if (!tray) {
    return;
  }

  // only when doing a build check for updates
  if (tray.dinner[0] === 'build') {
    updateNotifier({
      packageName: pkg.name,
      packageVersion: pkg.version,
      updateCheckInterval: 1
    }).notify();
  }

  // replace args from command on with dinner
  process.argv = _.union(process.argv.slice(0, 2), tray.dinner);

  // tray includes recipe
  if (tray.recipe) {

    // on the first hook
    cli.on('cli:go', function(data, eat) {

      // prompt recipe
      kitchen.confirm(tray, eat);

    });

  }
};