#!/usr/bin/env node

'use strict';

const { spawn } = require('child_process');
const chalk = require('chalk');

const pkg = require('../package.json'),
  clean = require('../lib/clean'),
  recipes = require('../lib/recipes'),
  setup = require('../lib/setup'),
  utils = require('../lib/utils'),
  kitchen = require('../lib/kitchen');

let args = process.argv.slice(2);

// help
let cmd = args.shift();

if (cmd === '-h' || cmd === '--help' || cmd === 'help') {
  displayHelp();
}

// version
else if (cmd === '-v' || cmd === '--version' || cmd === 'version') {
  console.log(pkg.version);
} else {
  let target;

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

  // uninstall
  else if (cmd === 'uninstall') {
    displayBanner(false);

    setup.uninstall();
  }

  // reset
  else if (cmd === 'reset') {
    displayBanner();

    recipes.reset(target);
  }

  // generate
  else if (cmd === 'generate') {
    displayBanner();

    setup.generate();
  }

  // clean
  else if (cmd === 'clean') {
    displayBanner();

    clean.run(args).catch(handlePromptExit);
  }

  // no args
  else if (!cmd) {
    displayHelp();
  }

  // unknown
  else {
    // deprecated
    if (cmd !== 'run' && cmd !== 'build' && cmd !== 'r' && cmd !== 'b') {
      args.unshift(cmd);
    } else {
      console.warn(
        chalk.red.bold('DEPRECATED: ') +
          ' Use ' +
          chalk.yellow('tn') +
          ' instead of ' +
          chalk.yellow('tn ' + cmd) +
          '\n'
      );
    }

    const tray = kitchen.cook(args);

    args = tray ? tray.dinner : args;

    const opts = {
      stdio: 'inherit',
      preferAppc: false, // Always use Titanium CLI (ti)
    };

    // Show what TiNy made (only for build and create, not to mess with JSON output)
    console.log(
      chalk.cyan.bold('TiNy') + ' cooked: ' + chalk.yellow('ti ' + utils.join(args)) + '\n'
    );

    const eat = function () {
      // Execute ti command directly
      spawn('ti', args, opts);
    };

    // verbose prompt
    if (tray && tray.recipe) {
      kitchen.confirm(tray, eat);
    } else {
      eat();
    }
  }
}

// Ctrl+C at a prompt is a normal way to say no, not a crash. Without this the
// user gets an ExitPromptError stack trace.
function handlePromptExit(err) {
  if (err && err.name === 'ExitPromptError') {
    console.log();
    return;
  }

  throw err;
}

// generate() prompts from inside a spawn callback, so its rejection surfaces here
process.on('unhandledRejection', handlePromptExit);

// help
function displayHelp() {
  displayBanner();

  console.log('Commands:');
  console.log();
  console.log(
    '  ' + chalk.cyan('*') + '\t\t\t\t' + 'cook recipes for ' + chalk.yellow('ti build') + '.'
  );
  console.log();
  console.log('  ' + chalk.cyan('list, recipes') + '\t\t\t' + 'lists all recipes in the book.');
  console.log();
  console.log(
    '  Add ' +
      chalk.yellow('project') +
      ' before the next commands to use ' +
      chalk.yellow('tn.json') +
      ' in current dir.'
  );
  console.log();
  console.log(
    '  ' +
      chalk.cyan('[project] save <name> *') +
      '\t' +
      'save a recipe, possibly overriding a built-in.'
  );
  console.log('  ' + chalk.cyan('[project] rename <old> <new>') + '\t' + 'renames a recipe.');
  console.log(
    '  ' +
      chalk.cyan('[project] remove <name>') +
      '\t' +
      'removes a recipe, possibly restoring an overridden built-in'
  );
  console.log(
    '  ' +
      chalk.cyan('[project] reset') +
      '\t\t' +
      'removes all custom recipes, restoring the built-in'
  );
  console.log();
  console.log(
    '  ' +
      chalk.cyan('generate') +
      '\t\t\t' +
      'generates simulators/device user-recipes (' +
      chalk.yellow('tn iphone6plus') +
      ')'
  );
  console.log();
  console.log(
    '  ' + chalk.cyan('clean') + '\t\t\t\t' + 'deletes iOS simulators whose runtime is gone'
  );
  console.log(
    '  ' + chalk.cyan('clean --data') + '\t\t\t' + 'erases contents and settings, keeps simulators'
  );
  console.log(
    '  ' + chalk.cyan('clean --runtimes') + '\t\t' + 'deletes installed iOS runtimes you pick'
  );
  console.log();
  console.log(
    '  ' + chalk.cyan('uninstall') + '\t\t\t' + 'uninstalls the old 2.x Titanium CLI hook'
  );
  console.log();
  console.log('  ' + chalk.cyan('-h, --help, help') + '\t\t' + 'displays help');
  console.log('  ' + chalk.cyan('-v, --version, version') + '\t' + 'displays the current version');
  console.log(
    '  ' +
      chalk.cyan('--verbose') +
      '\t\t\t' +
      'shows what\'s cooking and confirm or save the recipe'
  );
  console.log();
}

function displayBanner(doUpdate) {
  if (doUpdate !== false) {
    // Use modern update-notifier v7+ API with proper CommonJS import
    const { default: updateNotifier } = require('update-notifier');
    const notifier = updateNotifier({
      pkg: pkg,
      updateCheckInterval: 1000 * 60 * 60 * 24, // Check once per day
    });
    notifier.notify({
      defer: false,
      isGlobal: true,
    });
  }

  // display banner
  console.log(chalk.cyan.bold('TiNy') + ', version ' + pkg.version);
  console.log('Copyright (c) 2016-2021, Jason Kneen. All Rights Reserved.');
  console.log();
}
