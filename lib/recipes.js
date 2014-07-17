var fs = require("fs"),
  path = require("path"),
  logger = require("./logger"),
  utils = require('./utils'),
  colors = require('colors'),
  _ = require("underscore");

exports.has = has;
exports.get = get;
exports.setDefault = setDefault;
exports.list = list;
exports.save = save;
exports.remove = remove;
exports.rename = rename;
exports.reset = reset;

var path_home = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
var path_user = path.join(path_home, '.tn.json');
var path_project = path.join(process.cwd(), "tn.json");

var recipes_system = require('./../tn.json'),
  recipes_user = fs.existsSync(path_user) ? require(path_user) : {},
  recipes_project = fs.existsSync(path_project) ? require(path_project) : {},
  recipes_combined = _.extend({}, recipes_system, recipes_user, recipes_project);

function has(recipe) {
  return _.has(recipes_combined, recipe);
}

function get(recipe) {
  return (typeof recipes_combined[recipe] === 'string') ? recipes_combined[recipe].split(' ') : recipes_combined[recipe];
}

function setDefault(args) {
  save('_default', args);
}

function list(forReadMe) {

  if (forReadMe) {

    _.each(recipes_system, function(recipe, name) {
      console.log('|' + name + '|' + utils.join(recipe) + '|');
    });

    return;
  }

  console.log('Recipes defined by: ' + ('built-in'.green) + ', ' + ('user'.cyan) + ', ' + ('user-override'.blue) + ', ' + ('project'.yellow) + ' and ' + ('project-override'.red));
  console.log();

  var recipes = _.keys(recipes_combined).sort();

  _.each(recipes, function(recipe) {
    var args = recipes_combined[recipe],
      color;

    if (_.has(recipes_project, recipe)) {
      color = _.has(recipes_system, recipe) || _.has(recipes_user, recipe) ? 'red' : 'yellow';
    } else if (_.has(recipes_user, recipe)) {
      color = _.has(recipes_system, recipe) ? 'blue' : 'cyan';
    } else {
      color = 'green';
    }

    var commands = '';

    if (_.isString(args)) {
      commands += ' ' + args;
    } else {
      commands += utils.join(args);
    }

    console.log('  ' + getRecipeName(recipe) + ': ' + commands[color]);

    if (recipe === '_default') {
      console.log();
    }

  });

  console.log();
}

function save(recipe, args, location) {

  if (!validateRecipeName(recipe)) {
    return;
  }

  location = location || 'user';

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

  if (location == 'project') {
    recipes_combined[recipe] = recipes_project[recipe] = args;
    fs.writeFileSync(path_project, JSON.stringify(recipes_project));
  } else {
    recipes_combined[recipe] = recipes_user[recipe] = args;
    fs.writeFileSync(path_user, JSON.stringify(recipes_user));
  }

  var clr;

  if (_.has(recipes_project, recipe)) {
    clr = _.has(recipes_system, recipe) || _.has(recipes_user, recipe) ? 'red' : 'yellow';
  } else if (_.has(recipes_user, recipe)) {
    clr = _.has(recipes_system, recipe) ? 'blue' : 'cyan';
  } else {
    clr = 'green';
  }

  console.log();
  console.log('  ' + getRecipeName(recipe) + ': ' + utils.join(args)[clr]);

  console.log();
}

function remove(recipe, location) {

  if (!validateRecipeName(recipe)) {
    return;
  }

  location = location || 'user';

  if (_.has(recipes_user, recipe) === false && _.has(recipes_project, recipe) === false) {
    logger.error('Unknown user or project recipe: ' + (recipe || '(none)').cyan);
    return;
  }

  if (location == 'project') {
    delete recipes_project[recipe];
    fs.writeFileSync(path_project, JSON.stringify(recipes_project));
  } else {
    delete recipes_user[recipe];
    fs.writeFileSync(path_user, JSON.stringify(recipes_user));
  }

  recipes_combined = _.extend({}, recipes_system, recipes_user, recipes_project);

  logger.info('Removed ' + location + ' recipe: ' + getRecipeName(recipe).cyan);

  console.log();
}

function rename(oldRecipe, newRecipe, location) {

  if (!validateRecipeName(newRecipe)) {
    return;
  }

  if (_.has(recipes_user, oldRecipe) === false && _.has(recipes_project, oldRecipe) === false) {
    logger.error('Unknown user or project recipe: ' + oldRecipe.yellow);
    return;
  }

  if (location == 'project') {
    recipes_project[newRecipe] = recipes_project[oldRecipe];
    delete recipes_project[oldRecipe];
    fs.writeFileSync(path_project, JSON.stringify(recipes_project));
  } else {
    recipes_user[newRecipe] = recipes_user[oldRecipe];
    delete recipes_user[oldRecipe];
    fs.writeFileSync(path_user, JSON.stringify(recipes_user));
  }

  logger.info('Renamed recipe: ' + oldRecipe.yellow + ' > ' + newRecipe.yellow);
  recipes_combined = _.extend({}, recipes_system, recipes_user);

  console.log();
}

function reset(location) {

  if (location == 'project') {
    fs.unlinkSync(path_project);
    logger.info('Reset project recipes and default');
  } else {
    fs.unlinkSync(path_user);
    logger.info('Reset user recipes and default');
  }

  console.log();
}

function validateRecipeName(name) {
  var valid = !_.isEmpty(name);

  if (!valid) {
    logger.error('Invalid recipe name: ' + (name || '(none)').yellow);
  }

  return valid;
}

function getRecipeName(name) {
  return (name === '_default') ? 'default' : name;
}