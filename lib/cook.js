var _ = require('underscore'),
  path = require('path'),
  fields = require('fields');

var recipes = require("./recipes"),
  logger = require("./logger"),
  utils = require('./utils');

exports.cook = cook;

function cook(args, cfg, callback) {

  // we seems to run via Studio, ignore
  if (args.indexOf('--no-colors') !== -1 && args.indexOf('--no-progress-bars') !== -1 && args.indexOf('--no-prompt') !== -1) {
    callback(false);
    return;
  }

  var state = {
    cfg: cfg,
    verbose: false,
    recipes: [],
    processed: {}
  };

  // remove build command
  args.splice(args.indexOf('build'), 1);

  var i;

  // catch and remove skip
  if ((i = args.indexOf('skip')) !== -1) {
    args.splice(i, 1);
    callback(args);
    return;
  }

  // catch and remove verbose
  if ((i = args.indexOf('verbose')) !== -1) {
    state.verbose = true;
    args.splice(i, 1);
  }

  // save as what we might want to save in verbose mode
  var args_clean = _.clone(args);

  // remove sdk from clean args if it's the first arg (then probably inserted by Ti)
  if (args_clean[0] === '--sdk') {
    args_clean.splice(0, 2);
  }

  // move platform to 1st place (prevents ambiguous options)
  if ((i = args.indexOf('-p')) !== -1 || (i = args.indexOf('--platform')) !== -1) {
    args.unshift.apply(args, args.splice(i, 2));
  }

  // prepend default recipe
  var def = recipes.get('_default');
  state.verbose && logger.debug('Prepending default recipe: ' + utils.join(def).yellow);
  args.unshift.apply(args, def);

  // parse args
  parseArgs(args, state);

  // rebuild args
  args = rebuildArgs(state);

  // prepend build command again
  args.unshift('build');

  // Show what TiNy made
  console.log('TiNy'.cyan.bold + ' cooked: ' + 'ti '.yellow + utils.join(args).yellow + '\n');

  // verbose triggers interactive mode
  if (state.verbose) {

    fields.select({
      title: 'What would you like me to do?',
      numbered: true,
      default: 1,
      options: [{
        label: 'Continue build',
        value: 'execute'
      }, {
        label: 'Save as recipe: ' + utils.join(args_clean).yellow,
        value: 'save'
      }, {
        label: 'Exit',
        value: 'exit'
      }]
    }).prompt(function(err, value) {

      if (err) {
        console.log();
        console.error(('' + err)['red']);

      } else if (value === 'execute') {
        callback(args);

      } else if (value === 'save') {

        fields.text({
          title: 'What do you want to name it?',
          validate: function(value) {

            if (/^([a-z0-9]+(?:-[a-z0-9]+)*)$/i.test(value)) {
              return true;
            }

            console.error('Error: format as: my-Recipe'.red);

            return false;
          }
        }).prompt(function(err, value) {

          if (err) {
            console.log();
            console.error(('' + err)['red']);
          } else {
            console.log();
            recipes.save(value, args_clean);
          }

          process.exit();
        });

      } else {
        process.exit();
      }
    });

  }

  // pass back
  else {
    callback(args);
  }
}

function lookup(arg, state) {

  // options somehow missing in build cfg?!
  if (arg === 'sdk') {
    return {
      type: 'option'
    };
  } else if (arg === 's') {
    return {
      type: 'option',
      abbr: 'sdk'
    };
  }

  var platform_results = {};

  // for each platform we have a config for
  _.each(state.cfg.platforms, function(platform_cfg, platform) {

    // store possible result for platform temporary
    var platform_result = lookupIn(arg, platform_cfg);

    // we have a result
    if (platform_result) {

      // build config uses 'iphone' for 'ios'
      platform = (platform === 'iphone') ? 'ios' : platform;

      platform_results[platform] = platform_result;
    }

  });

  var platform_results_ln = _.size(platform_results);

  // multiple platforms knew arg
  if (platform_results_ln > 1) {

    // the current selected platform is one of them > go with that
    if (state.processed.platform && platform_results[state.processed.platform]) {
      return platform_results[state.processed.platform];
    }

    // return the platform names as the result
    return {
      platforms: _.keys(platform_results)
    };
  }

  // single platform knew
  else if (platform_results_ln === 1) {
    var platform = _.first(_.keys(platform_results));
    var result = platform_results[platform];

    // include platform for implicit set
    result.platform = platform;

    return result;
  }

  // no platform-specific result
  else if (platform_results_ln === 0) {

    // search in shared config
    return lookupIn(arg, state.cfg);
  }
}

function lookupIn(arg, cfg) {
  var result;

  if (cfg.options && cfg.options[arg]) {
    result = {
      type: 'options'
    };

  } else if (cfg.flags && cfg.flags[arg]) {
    result = {
      type: 'flags'
    };

  } else {

    _.some(['options', 'flags'], function(type) {

      if (!cfg[type]) {
        return false;
      }

      return _.some(cfg[type], function(val, key) {

        if (val.abbr === arg) {

          result = {
            abbr: key,
            type: type
          };

          return true;
        }
      });

    });

  }

  return result;
}

function parseArgs(args, state) {
  var arg, arg_orig, match;

  state.verbose && logger.debug('Parsing args: ' + utils.join(args).yellow);

  for (var i = 0, l = args.length; i < l; i++) {
    arg_org = arg = args[i];

    state.verbose && logger.debug('Parsing arg: ' + arg.yellow);

    // match option or flag
    match = arg.match(/^[-]+([a-z-]+)$/i);

    if (match) {
      arg = match[1];

      var result = lookup(arg, state);

      // unknown
      if (!result) {
        logger.warn('Unknown option: ' + arg.red);

        state.processed[arg_org] = null;

        continue;
      }

      // found in multiple platforms
      if (result.platforms) {
        logger.warn('Ambiguous option with no platform set so far: ' + (arg + ' (' + result.platforms.join(',') + ')').red);

        state.processed[arg_org] = null;

        continue;
      }

      // set platform of platform-specific option or flag
      if (result.platform) {
        state.processed.platform = result.platform;

        state.verbose && logger.debug('Setting implicit platform: ' + result.platform.yellow);
      }

      // replace abbr with full-name
      if (result.abbr) {
        arg = result.abbr;

        state.verbose && logger.debug('Replacing abbr with full name: ' + result.abbr.yellow);
      }

      // flag 
      if (result.type === 'flags') {
        state.processed['--' + arg] = null;

        state.verbose && logger.debug('Recognized as flag');
      }

      // option
      else {

        // next
        i++;

        // next is value
        state.processed[arg] = args[i];

        state.verbose && logger.debug('Using next arg as option value: ' + args[i].yellow);
      }
    }

    // recipe or magic ingredient
    else {

      // Recipe
      if (recipes.has(arg)) {

        // prevent loop
        if (state.recipes.indexOf(arg) !== -1) {
          logger.warn('Preventing recipe loop: ' + arg.red);
          continue;
        }

        state.recipes.push(arg);

        // get recipe args
        var recipeArgs = recipes.get(arg);

        state.verbose && logger.info('Cooking recipe: ' + arg.yellow);

        // process recipe args
        parseArgs(recipeArgs, state);
      }

      // UUID
      else if (arg.match(/^[0-9A-Z]{8}-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{12}/i)) {
        state.processed['pp-uuid'] = arg.toUpperCase();
        state.processed['platform'] = 'ios';

        // default to appstore
        state.processed['target'] = state.processed['target'] || 'dist-appstore';

        state.verbose && logger.info('Detected provisioning profile UUID: ' + arg.yellow);
      }

      // Certificate
      else if (arg.match(/^.+ \([0-9A-Z]{10}\)/i)) {

        // default to appstore
        state.processed['target'] = state.processed['target'] || 'dist-appstore';

        // option depends on target
        var option = (state.processed['target'] === 'device') ? 'developer-name' : 'distribution-name';
        state.processed[option] = arg.toUpperCase();

        state.processed['platform'] = 'ios';

        state.verbose && logger.info('Detected certificatie: ' + arg.yellow);
      }

      // SDK
      else if (arg.match(/^[0-9]\.[0-9]\.[0-9]/)) {
        state.processed['sdk'] = arg;

        state.verbose && logger.info('Detected SDK: ' + arg.yellow);
      }

      // Keystore
      else if (arg.match(/\.keystore$/)) {
        state.processed['keystore'] = arg;
        state.processed['platform'] = 'android';

        // default to dist-playstore
        state.processed['target'] = state.processed['target'] || 'dist-playstore';

        state.verbose && logger.info('Detected keystore: ' + arg.yellow);
      }

      // Unknown
      else {
        logger.warn('Unknown magic ingredient: ' + arg.red);

        state.processed[arg_org] = null;
      }
    }
  }
}

function rebuildArgs(state) {
  var args = [];

  // Allows target to be set after magic ingredient for certificate name
  if (state.processed.platform === 'ios') {

    if (state.processed['developer-name'] && (state.processed.target === 'dist-appstore' || state.processed.target === 'dist-adhoc')) {
      state.processed['distribution-name'] = state.processed['developer-name'];
      delete state.processed['developer-name'];

    } else if (state.processed['distribution-name'] && state.processed.target !== 'dist-appstore' && state.processed.target !== 'dist-adhoc') {
      state.processed['developer-name'] = state.processed['distribution-name'];
      delete state.processed['distribution-name'];
    }
  }

  // default to project/dist as output when needed
  if (!state.processed['output-dir'] && (state.processed['target'] === 'dist-playstore' || state.processed['target'] === 'dist-adhoc' || state.processed.platform === 'blackberry')) {
    state.verbose && logger.debug('Setting default output-dir');

    state.processed['output-dir'] = path.join(state.processed['project-dir'] ? state.processed['project-dir'] : process.cwd(), 'dist');
  }

  _.each(state.processed, function(val, key) {

    // unknown arg as-is
    if (val === null) {
      args.push(key);
      return;
    }

    // there should be no more abbr, but just for sure ;)
    key = ((key.length === 1) ? '-' : '--') + key;

    // disabled flag
    if (val === false) {
      return;
    }

    // flag
    else if (val === true) {
      args.push(key);
    }

    // options
    else {
      args.push(key, val);
    }

  });

  return args;
}