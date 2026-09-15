const fs = require('fs'),
  path = require('path'),
  logger = require('./logger'),
  utils = require('./utils'),
  chalk = require('chalk'),
  _ = require('lodash');

exports.has = has;
exports.get = get;
exports.list = list;
exports.save = save;
exports.remove = remove;
exports.rename = rename;
exports.reset = reset;
exports.listOrphans = listOrphans;
exports.findUserByArgs = findUserByArgs;

const path_home = process.env[process.platform === 'win32' ? 'USERPROFILE' : 'HOME'];
const path_user = path.join(path_home, '.tn.json');
const path_project = path.join(process.cwd(), 'tn.json');

const recipes_system = require('./../tn.json');
const recipes_user = read(path_user);
const recipes_project = read(path_project);
let recipes_combined = _.extend({}, recipes_system, recipes_user, recipes_project);

// These files are meant to be hand-edited, so a stray comma is a matter of time.
// A broken one is reported and skipped: taking down every single command over a
// typo would leave no way to even list the recipes and find it.
function read(file) {
  if (!fs.existsSync(file)) {
    return {};
  }

  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    logger.error('Ignoring ' + chalk.yellow(file) + ': ' + e.message);
    return {};
  }
}

// Written indented because the user is expected to open and edit this.
function write(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
}

function has(name) {
  return _.has(recipes_combined, name);
}

function get(name, ingredient) {
  let recipe;

  if (typeof recipes_combined[name] === 'string') {
    recipe = recipes_combined[name].split(' ');
  } else {
    recipe = recipes_combined[name];
  }

  if (ingredient) {
    recipe = _.map(recipe, function (val) {
      // TODO: Account for spaces in ingredient ("ddd ddd")
      return val.replace('%s', ingredient);
    });
  }

  return recipe;
}

const GROUP_ORDER = [
  'iPhone Simulators',
  'iPad Simulators',
  'Android Emulators',
  'iOS Devices',
  'Android Devices',
  'Distribution',
  'Aliases',
  'General'
];

function generalSubgroup(args) {
  const argsArr = _.isString(args) ? args.split(' ') : args;
  const has = (val) => argsArr.includes(val);
  const argsStr = argsArr.join(' ');

  // Config: parametric recipes with %s
  if (argsStr.includes('%s')) return 2;

  // Apple/iOS
  if (argsStr.includes('platform ios') || has('--ios') || has('--iphone') ||
      has('--mac') || has('--universal') || has('--device-family') ||
      (has('--target') && has('simulator')) || has('--simulator')) return 0;

  // Android
  if (argsStr.includes('platform android') || has('--android') ||
      has('--emulator') || (has('--target') && has('emulator'))) return 1;

  // Misc (device, desktop, etc.)
  return 3;
}

function categorizeRecipe(name, args) {
  const argsArr = _.isString(args) ? args.split(' ') : args;
  const has = (val) => argsArr.includes(val);
  const argsStr = argsArr.join(' ');

  // Parametric recipes always go to General
  if (argsStr.includes('%s')) return 'General';

  // Single-flag alias pointing to another recipe
  if (argsArr.length === 1 && argsArr[0].startsWith('--') && _.has(recipes_combined, argsArr[0].slice(2))) {
    return 'Aliases';
  }

  // Specific simulator with UDID (generated recipes)
  if (has('--simulator') && has('--device-id')) {
    return name.startsWith('ipad') ? 'iPad Simulators' : 'iPhone Simulators';
  }

  // sim-type based (ip18, ip26, ipad18, ipad26)
  if (has('--sim-type')) {
    const simType = argsArr[argsArr.indexOf('--sim-type') + 1];
    return simType === 'ipad' ? 'iPad Simulators' : 'iPhone Simulators';
  }

  // Specific Android emulator with device-id (generated recipes)
  if (has('--emulator') && has('--device-id')) return 'Android Emulators';

  // Distribution targets (direct or via alias)
  if (argsStr.includes('dist-') || has('--appstore') || has('--playstore') || has('--adhoc')) {
    return 'Distribution';
  }

  // iOS real devices (ioses)
  if (has('--ios') && has('--device') && has('--device-id')) return 'iOS Devices';

  // Android real devices
  if (has('--android') && has('--device') && has('--device-id')) return 'Android Devices';

  return 'General';
}

function list(forReadMe) {
  if (forReadMe) {
    _.each(recipes_system, function (recipe, name) {
      console.log('|' + name + '|' + utils.join(recipe) + '|');
    });

    return;
  }

  console.log(
    'Recipes defined by: ' +
      chalk.green('built-in') +
      ', ' +
      chalk.cyan('user') +
      ', ' +
      chalk.blue('user-override') +
      ', ' +
      chalk.yellow('project') +
      ' and ' +
      chalk.red('project-override')
  );
  console.log();

  // Build grouped map
  const grouped = {};
  GROUP_ORDER.forEach(g => { grouped[g] = []; });

  const systemFirst = (a, b) => {
    const diff = (_.has(recipes_system, a) ? 0 : 1) - (_.has(recipes_system, b) ? 0 : 1);
    return diff !== 0 ? diff : a.localeCompare(b);
  };

  _.each(_.keys(recipes_combined).sort(systemFirst), function (recipe) {
    const args = recipes_combined[recipe];
    const group = categorizeRecipe(recipe, args);
    grouped[group].push(recipe);
  });

  // Display each group
  GROUP_ORDER.forEach(function (group) {
    const members = grouped[group];
    if (members.length === 0) return;

    console.log(chalk.bold(group + ':'));

    const isGeneral = group === 'General';
    const items = isGeneral
      ? members.slice().sort(function (a, b) {
        const diff = generalSubgroup(recipes_combined[a]) - generalSubgroup(recipes_combined[b]);
        return diff !== 0 ? diff : systemFirst(a, b);
      })
      : members;

    let lastSubgroup = null;

    items.forEach(function (recipe) {
      const args = recipes_combined[recipe];
      let color;

      if (_.has(recipes_project, recipe)) {
        color = _.has(recipes_system, recipe) || _.has(recipes_user, recipe) ? 'red' : 'yellow';
      } else if (_.has(recipes_user, recipe)) {
        color = _.has(recipes_system, recipe) ? 'blue' : 'cyan';
      } else {
        color = 'green';
      }

      if (isGeneral) {
        const sg = generalSubgroup(args);
        if (lastSubgroup !== null && sg !== lastSubgroup) console.log();
        lastSubgroup = sg;
      }

      const commands = _.isString(args) ? ' ' + args : utils.join(args);
      console.log('  ' + recipe + ': ' + chalk[color](commands));
    });

    console.log();
  });
}

function save(recipe, args, location, silent) {
  if (!validateRecipeName(recipe)) {
    return;
  }

  location = location || 'user';

  if (!silent) {
    if (location == 'project' && _.has(recipes_project, recipe)) {
      logger.info('Changed existing project recipe');
    } else if (location == 'user' && _.has(recipes_user, recipe)) {
      logger.info('Changed existing user recipe');
    } else if (location == 'project' && _.has(recipes_user, recipe)) {
      logger.info('Saved project recipe, overriding user');
    } else if (location === 'project' && _.has(recipes_system, recipe)) {
      logger.info('Saved project recipe, overriding built-in');
    } else if (location === 'user' && _.has(recipes_system, recipe)) {
      logger.info('Saved user recipe, overriding built-in');
    } else {
      logger.info('Saved ' + location + ' recipe');
    }
  }

  if (location == 'project') {
    recipes_combined[recipe] = recipes_project[recipe] = args;
    write(path_project, recipes_project);
  } else {
    recipes_combined[recipe] = recipes_user[recipe] = args;
    write(path_user, recipes_user);
  }

  let clr;

  if (_.has(recipes_project, recipe)) {
    clr = _.has(recipes_system, recipe) || _.has(recipes_user, recipe) ? 'red' : 'yellow';
  } else if (_.has(recipes_user, recipe)) {
    clr = _.has(recipes_system, recipe) ? 'blue' : 'cyan';
  } else {
    clr = 'green';
  }

  if (!silent) {
    console.log();
    console.log('  ' + recipe + ': ' + chalk[clr](utils.join(args)));
    console.log();
  }

  return { recipe, args, clr };
}

function remove(recipe, location, silent) {
  if (!validateRecipeName(recipe)) {
    return;
  }

  location = location || 'user';

  if (_.has(recipes_user, recipe) === false && _.has(recipes_project, recipe) === false) {
    logger.error('Unknown user or project recipe: ' + chalk.cyan(recipe || '(none)'));
    return;
  }

  if (location == 'project') {
    delete recipes_project[recipe];
    write(path_project, recipes_project);
  } else {
    delete recipes_user[recipe];
    write(path_user, recipes_user);
  }

  recipes_combined = _.extend({}, recipes_system, recipes_user, recipes_project);

  if (!silent) {
    logger.info('Removed ' + location + ' recipe: ' + chalk.cyan(recipe));
    console.log();
  }
}

function rename(oldRecipe, newRecipe, location) {
  if (!validateRecipeName(newRecipe)) {
    return;
  }

  if (_.has(recipes_user, oldRecipe) === false && _.has(recipes_project, oldRecipe) === false) {
    logger.error('Unknown user or project recipe: ' + chalk.yellow(oldRecipe));
    return;
  }

  if (location == 'project') {
    recipes_project[newRecipe] = recipes_project[oldRecipe];
    delete recipes_project[oldRecipe];
    write(path_project, recipes_project);
  } else {
    recipes_user[newRecipe] = recipes_user[oldRecipe];
    delete recipes_user[oldRecipe];
    write(path_user, recipes_user);
  }

  logger.info('Renamed recipe: ' + chalk.yellow(oldRecipe) + ' > ' + chalk.yellow(newRecipe));
  recipes_combined = _.extend({}, recipes_system, recipes_user, recipes_project);

  console.log();
}

function reset(location) {
  if (location == 'project') {
    // Safety check: don't delete built-in tn.json if we're in the CLI's own directory
    const builtin_path = path.resolve(__dirname, '..', 'tn.json');
    if (path.resolve(path_project) === builtin_path) {
      logger.error('Cannot reset project recipes: you are in the TiNy CLI directory');
      logger.error('Navigate to your Titanium project directory first');
      return;
    }

    if (!fs.existsSync(path_project)) {
      logger.error('No project recipes found (tn.json does not exist in current directory)');
      return;
    }

    fs.unlinkSync(path_project);
    logger.info('Reset project recipes');
  } else {
    if (!fs.existsSync(path_user)) {
      logger.error('No user recipes found (~/.tn.json does not exist)');
      return;
    }

    fs.unlinkSync(path_user);
    logger.info('Reset user recipes');
  }

  console.log();
}

// A null set means "we could not determine what is installed for that platform",
// in which case its recipes are left alone instead of being reported as orphans.
function listOrphans(activeIosUdids, activeAndroidIds) {
  const orphans = [];

  _.each(recipes_user, function (args, name) {
    const argsArr = _.isString(args) ? args.split(' ') : args;

    if (!_.isArray(argsArr)) return;

    const deviceIdIndex = argsArr.indexOf('--device-id');
    if (deviceIdIndex === -1) return;

    const deviceId = argsArr[deviceIdIndex + 1];
    if (!deviceId) return;

    if (argsArr.includes('--ios') && argsArr.includes('--simulator')) {
      if (activeIosUdids && !activeIosUdids.has(deviceId)) orphans.push(name);
    } else if (argsArr.includes('--android') && argsArr.includes('--emulator')) {
      if (activeAndroidIds && !activeAndroidIds.has(deviceId)) orphans.push(name);
    }
  });

  return orphans;
}

// The name of the user recipe with exactly these arguments, if there is one.
function findUserByArgs(args) {
  return _.findKey(recipes_user, recipe =>
    _.isEqual(_.isString(recipe) ? recipe.split(' ') : recipe, args)
  );
}

function validateRecipeName(name) {
  if (!name.match(/^[a-z0-9]+(-[a-z0-9]+)*$/i)) {
    logger.error('Invalid recipe name: ' + chalk.yellow(name || '(none)'));
    return false;
  }

  return true;
}
