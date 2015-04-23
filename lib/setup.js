#!/usr/bin/env node

var path = require('path');

var logger = require('./logger'),
  recipes = require('./recipes'),
  spawn = require('./spawn');

exports.uninstall = uninstall;
exports.generate = generate;

var PATH = path.join(__dirname, '..', 'hooks');

function uninstall() {
  logger.info('Uninstalling Titanium CLI hook..');

  spawn('ti', ['config', '-r', 'paths.hooks', PATH], {
    stdio: 'inherit'
  });
}

function generate() {

  logger.info('Looking up connected devices, emulators and simulators..');

  spawn('ti', ['info', '-o', 'json'], null, function process(error, stdout, stderr) { // jshint unused: false

    if (error) {
      logger.error('Failed to read Titanium info: ' + JSON.stringify([error, stderr]));

    } else {

      console.log();

      var config = JSON.parse(stdout);

      if (config.android) {

        if (config.android.emulators && config.android.emulators.length > 0) {

          config.android.emulators.forEach(function forEach(dev) {
            var name = dev.name.toLowerCase().replace(/\.+/, '').replace(/[^a-z0-9]+/g, '-');
            var recipe = ['--platform', 'android', '--target', 'emulator', '--device-id', dev.name];

            if (!recipes.has(name) || !arraysIdentical(recipes.get(name), recipe)) {
              recipes.save(name, recipe);
            }
          });
        }

        if (config.android.devices && config.android.devices.length > 0) {

          config.android.devices.forEach(function forEach(dev) {
            var name = dev.name.toLowerCase().replace(/\.+/, '').replace(/[^a-z0-9]+/g, '-');
            var recipe = ['--platform', 'android', '--target', 'device', '--device-id', dev.id];

            if (!recipes.has(name) || !arraysIdentical(recipes.get(name), recipe)) {
              recipes.save(name, recipe);
            }
          });
        }
      }

      if (config.ios) {

        if (config.ios.devices && config.ios.devices.length > 0) {

          config.ios.devices.forEach(function forEach(dev) {

            if (dev.udid === 'itunes') {
              return;
            }

            var name = dev.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            var recipe = ['--platform', 'ios', '--target', 'device', '--device-id', dev.udid];

            if (!recipes.has(name) || !arraysIdentical(recipes.get(name), recipe)) {
              recipes.save(name, recipe);
            }
          });
        }

        if (config.ios.simulators) {
          var version, versions = [];

          for (version in config.ios.simulators) {
            versions.push(version);
          }

          // we want newest versoon first
          versions.sort();
          versions.reverse();

          versions.forEach(function forEach(version) {

            config.ios.simulators[version].forEach(function forEach(dev) {
              var name = dev.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
              var recipe = ['--platform', 'ios', '--target', 'simulator', '--device-id', dev.udid];

              if (recipes.has(name) && versions[0] !== version) {
                name = name + '-ios' + version.replace(/\./, '');
              }

              if (!recipes.has(name) || !arraysIdentical(recipes.get(name), recipe)) {
                recipes.save(name, recipe);
              }
            });

          });
        }
      }

      logger.info('Done');
    }

  });
}

function arraysIdentical(a, b) {
  var i = a.length;

  if (i !== b.length) {
    return false;
  }

  while (i--) {

    if (a[i] !== b[i]) {
      return false;
    }
  }

  return true;
}
