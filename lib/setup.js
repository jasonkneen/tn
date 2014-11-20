#!/usr/bin/env node

var child_process = require('child_process'),
  path = require('path');

var logger = require('./logger'),
  recipes = require('./recipes');

exports.install = install;
exports.uninstall = uninstall;
exports.generate = generate;

var PATH = path.join(__dirname, '..', 'hooks');

function install() {
  logger.info('Installing Titanium CLI hook..');

  child_process.exec('ti config -o json', function(error, stdout, stderr) {

    if (error) {
      logger.error('Failed to read Titanium config: ' + error);

    } else {

      var config = JSON.parse(stdout);

      if (config['paths.hooks']) {

        var i = config['paths.hooks'].indexOf(PATH);

        if (i === 0) {
          logger.info('Hook already installed');
          return;

        } else if (i !== -1) {
          logger.debug('Removing hook from old position (should be first)');
          config['paths.hooks'].splice(i, 1);
        }

        config['paths.hooks'].unshift(PATH);

      } else {
        config['paths.hooks'] = [PATH];
      }

      spawn('ti', ['config', 'paths.hooks'].concat(config['paths.hooks']), {
        stdio: 'inherit'
      });
    }

  });
}

function uninstall() {
  logger.info('Uninstalling Titanium CLI hook..');

  spawn('ti', ['config', '-r', 'paths.hooks', PATH], {
    stdio: 'inherit'
  });
}

function generate() {

  logger.info('Looking up connected devices, emulators and simulators..');

  var info_command = spawn('ti', ['info', '-o', 'json']);
  var info_string = "";
  var info_error = false;
  info_command.stdout.on('data', function(data) {
    info_string += data.toString();
  });
  info_command.stderr.on('data', function(data) {
    logger.error(data);
  });
  info_command.on('close', function(code) {
    process(code, info_string);
  });
  info_command.on('error', function(err) {
      logger.error('Failed to read Titanium info: ' + JSON.stringify(err));
  });

  function process(code, string) {

    if (code !== 0) {
      logger.error('Failed to read Titanium info: ' + error);

    } else {

      console.log();

      var config = JSON.parse(string);

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

      logger.info('Done');
    }

  };
}

function spawn(cmd, args, opts) {

  if (process.platform === 'win32') {
    args = ['/c', cmd].concat(args);
    cmd = process.env.comspec;
  }

  return child_process.spawn(cmd, args, opts);
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
