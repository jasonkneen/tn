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

  spawn('ti', ['config', '-o', 'json'], null, function process(error, stdout, stderr) { // jshint unused: false

    if (error) {
      logger.error('Failed to read Titanium config: ' + JSON.stringify([error, stderr]));

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

function spawn(cmd, args, opts, callback) {

  if (process.platform === 'win32') {
    args = ['/c', cmd].concat(args);
    cmd = process.env.comspec;
  }

  var childProcess = child_process.spawn(cmd, args, opts);

  if (callback) {
    var stdout = '';
    var stderr = '';

    childProcess.stdout.on('data', function(data) {
      stdout += data.toString();
    });
    childProcess.stderr.on('data', function(data) {
      stderr += data.toString();
    });
    childProcess.on('close', function(code) {
      callback(code !== 0, stdout, stderr);
    });
    childProcess.on('error', function(err) {
      callback(err, stdout, stderr);
    });
  }

  return childProcess;
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
