#!/usr/bin/env node

var child_process = require('child_process'),
  updateNotifier = require('update-notifier'),
  colors = require('colors'),
  package = require('../package.json'),
  recipes = require('../lib/recipes'),
  setup = require('../lib/setup');

var args = process.argv.slice(2);
var args_ln = args.length;

if (args[0] !== '-h' && args[0] !== '--help' && args[0] !== 'help') {
  var cmd = args.shift();

  // version
  if (cmd === '-v' || cmd === '--version' || args[0] === 'version') {
    console.log(package.version);
    return;
  }

  var target;

  // project
  if (cmd === 'project') {
    cmd = args.shift();
    target = 'project';
  }

  // list
  if (cmd === 'list' || cmd === 'recipes') {
    displayBanner();

    recipes.list(args[0] === 'readme');
  }

  // default
  else if (cmd === 'default') {
    displayBanner();

    recipes.setDefault(args);
  }

  // set
  else if (cmd === 'save') {
    displayBanner();

    recipes.save(args.shift(), args, target);
  }

  // rename
  else if (cmd === 'rename') {
    displayBanner();

    recipes.rename(args[0], args[1], target);
  }

  // remove
  else if (cmd === 'remove') {
    displayBanner();

    recipes.remove(args[0], target);
  }

  // reset
  else if (cmd === 'reset') {
    displayBanner();

    recipes.reset(target);
  }
  // install
  else if (cmd === 'install') {
    displayBanner(false);

    setup.install();
  }

  // uninstall
  else if (cmd === 'uninstall') {
    displayBanner(false);

    setup.uninstall();
  }

  // alias for 'ti build'
  else {

    // prepend build
    args.unshift('build',cmd);

    // execute ti
    child_process.spawn('ti', args, {

      // So that Ti CLI can setRawMode
      stdio: 'inherit'
    });
  }
}

// help
else {

  displayBanner();

  console.log('Commands:');
  console.log();
  console.log('  *'.cyan + '\t\t\t\t' + 'executes `ti build *` to save you 6 more keystrokes!');
  console.log();
  console.log('  list, recipes'.cyan + '\t\t\t' + 'lists all recipes in the book');
  console.log();
  console.log('  default *'.cyan + '\t\t\t' + 'sets a recipe (name) to always start out with (default: ios)');
  console.log();
  console.log('  [project] save <name> *'.cyan + '\t' + 'save a recipe, possibly overriding a built-in.');
  console.log('  [project] rename <old> <new>'.cyan + '\t' + 'renames a recipe.');
  console.log('  [project] remove <name>'.cyan + '\t' + 'removes a recipe, possibly restoring an overridden built-in');
  console.log('  [project] reset'.cyan + '\t\t' + 'removes all custom recipes and default, restoring the built-in');
  console.log('  \t\t\t\tAdd \'project\' before these commands to use tn.json in current dir.');
  console.log();
  console.log('  install'.cyan + '\t\t\t' + 'installs the Titanium CLI hook');
  console.log('  uninstall'.cyan + '\t\t\t' + 'uninstalls the Titanium CLI hook');
  console.log();
  console.log('  -h, --help, help'.cyan + '\t\t' + 'displays help');
  console.log('  -v, --version, version'.cyan + '\t' + 'displays the current version');
  console.log();
}

function displayBanner(update) {

  if (update !== false) {
    var notifier = updateNotifier({
      packagePath: '../package.json'
    });

    // check for updates
    notifier.update && notifier.notify();
  }

  // display banner
  console.log('TiNy'.cyan.bold + ', version ' + package.version);
  console.log(package.about.copyright);
  console.log();
}