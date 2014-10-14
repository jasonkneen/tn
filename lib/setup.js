#!/usr/bin/env node

var child_process = require('child_process'),
  path = require('path'),
  logger = require("./logger");

exports.install = install;
exports.uninstall = uninstall;

function install() {
  logger.info('Installing Titanium CLI hook..');

  spawn('ti', ['config', '-a', 'paths.hooks', path.join(__dirname, '..', 'hooks')], {
    stdio: 'inherit'
  });
}

function uninstall() {
  logger.info('Uninstalling Titanium CLI hook..');

  spawn('ti', ['config', '-r', 'paths.hooks', path.join(__dirname, '..', 'hooks')], {
    stdio: 'inherit'
  });
}

function spawn(cmd, args, opts) {

  if (process.platform === 'win32') {
    args = ['/c', cmd].concat(args);
    cmd = process.env.comspec;
  }

  return child_process.spawn(cmd, args, opts);
}
