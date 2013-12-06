var fs = require("fs"),
    path = require("path"),
    child_process = require('child_process'),
    fields = require('fields'),
    _ = require('underscore'),
    pkginfo = require('pkginfo')(module, 'version'),
    lb = require('os').EOL,
    logger = require("./logger"),
    recipes = require("./recipes");

exports.run = function(args) {

    // Preserve original args
    var args_original;

    // config
    var config = {};
    config.cwd = process.cwd();
    config.platforms = ['android', 'ios', 'tizen', 'blackberry', 'mobileweb'];
    config.targets = ['simulator', 'device', 'distribute', 'dist-playstore', 'dist-appstore', 'dist-adhoc'];
    config.flags = ['b', 'build-only', 'f', 'force', 'legacy', 'skip-js-minify', 'force-copy', 'force-copy-all', 'retina', 'tall', 'debug'];
    config.family = ['iphone', 'ipad', 'universal'];
    config.version = ['-v', 'v', 'version'];

    // options: what args translate into
    var options = {
        titanium: true,
        build: true,
        platform: 'ios',
        verbose: false
    };

    // PRINT VERSION
    if (args[0] && _.contains(config.version, args[0])) {
        console.log(module.exports.version);
        process.exit();
    }

    console.log("TiNy " + module.exports.version + " by Fokke Zandbergen <www.fokkezb.nl>" + lb + "The simple CLI for Titanium, Alloy and related tools." + lb);

    if (args[0]) {
        var match, recipe, i;

        // INSTALL HOOK
        if (args[0] === 'hook') {
            logger.info('Installing TiNy als Titanium CLI hook: ti ny');
            spawn('ti', ['config', '-a', 'paths.commands', __dirname + '/../commands']);
            //spawn('ti', ['config', '-a', 'paths.hooks', __dirname + '/../hooks']);
            process.exit();
            // TODO: Do above in callback after spawn
        }

        // LIST RECIPES
        else if (args[0] === 'recipes') {
            recipes.list();
            process.exit();
        }

        // SET/UNSET/RENAME RECIPE
        else if (match = args[0].match(/^([a-z0-9]+(?:-[a-z0-9]+)*):([a-z0-9]+(?:-[a-z0-9]+)*)?$/i)) {
            recipe = match[1];

            // RENAME (new:old)
            if (typeof match[2] !== 'undefined') {
                recipes.rename(recipe, match[2]);
            }

            // UNSET (this is the only argument)
            else if (args.length === 1) {
                recipes.unset(recipe);
            }

            // SET
            else {
                recipes.set(recipe, _.rest(args));
            }

            process.exit();
        }

        // VERBOSE
        i = _.indexOf(args, 'verbose');
        if (i !== -1) {
            options.verbose = true;
            args.splice(i, 1);
            args_original = _.clone(args);
        }
    }

    // params: what options (and some args) translate into
    var params = [];

    var i, l, arg, match, recipe, recipes_done = [];

    // PROCESS ARGS
    for (i = 0, l = args.length; i < l; i++) {
        arg = args[i];

        // APPLY RECIPE
        if (recipes.has(arg)) {
            args = recipes.apply(arg, args);
            l = args.length;
            i--;

            // verbose enabled
            if (options.verbose) {
                logger.trace("Cooked '" + arg + "', resulting in: " + args.join(' '));
            }
        }

        // PLATFORM
        else if (config.platforms.indexOf(arg) !== -1) {
            options.platform = arg;

            // Default output
            if (!options.output && arg === 'blackberry') {
                options.output = '~/Desktop';
            }
        }

        // TARGET
        else if (config.targets.indexOf(arg) !== -1) {
            options.target = arg;

            // Default output
            if (!options.output && (arg === 'dist-playstore' || arg === 'dist-adhoc')) {
                options.output = '~/Desktop';
            }

            // Map target to platform

            if (arg === 'dist-playstore') {
                options.platform = 'android';
            } else if (arg === 'dist-appstore' || arg === 'dist-adhoc') {
                options.platform = 'ios';
            } else if (arg === 'distribute') {
                options.platform = 'blackberry';
            }
        }

        // FAMILY
        else if (config.family.indexOf(arg) !== -1) {
            options.family = arg;
            options.platform = 'ios';
        }

        // UUID
        else if (arg.match(/^[0-9A-Z]{8}-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{12}/i)) {
            options.uuid = arg.toUpperCase();
            options.platform = 'ios';
            options.target = options.target || 'dist-appstore';
        }

        // Certificate
        else if (arg.match(/^.+ \([0-9A-Z]{10}\)/i)) {
            options.certificate = arg.toUpperCase();
            options.platform = 'ios';
            options.target = options.target || 'dist-appstore';
        }

        // SDK
        else if (arg.match(/^[0-9]\.[0-9]\.[0-9]/)) {
            options.sdk = arg;
        }

        // KEYSTORE
        else if (arg.match(/\.keystore$/)) {
            options.keystore = arg;
            options.platform = 'android';
        }

        // OUTPUT
        else if (arg.match(/^\/.+/) && (options.platform === 'blackberry' || options.target === 'dist-playstore' || options.target === 'dist-adhoc')) {
            options.output = arg;
        }

        // PARAM (key:val OR key=val)
        else if (match = arg.match(/^(.+)(?:=|:)(.+)$/)) {
            params.push(((match[1].length === 1) ? '-' : '--') + match[1], match[2]);
        }

        // PARAM (-K val OR --key val)
        else if (match = arg.match(/^[-]+([a-z-]+)$/i)) {

            // Change -retina to --retina
            if (match[1].length > 1) {
                arg = '--' + match[1];
            }

            // FLAG
            if (_.contains(config.flags, match[1])) {
                params.push(arg);
            }

            // KEY-VALUE
            else if (args[i + 1]) {

                // Fixes double platform (will still have problems with others though)
                if (match[1] === 'platform' || match[1] === 'p') {
                    options.platform = args[i + 1];
                
                } else {
                    params.push(arg, args[i + 1]);
                }
                
                i++;
            }

            // MISSING VALUE
            else {
                logger.error('Missing value for: ' + match[1]);
                process.exit();
            }
        }

        // UNKNOWN
        else {
            logger.error('Unknown argument or recipe: ' + arg);
            process.exit();
        }
    }

    // If we got this far we need to be in a project
    if (!fs.existsSync(path.join(config.cwd, 'tiapp.xml'))) {
        logger.error("TiNy must be called in a Titanium project's root directory");
        process.exit();
    }

    function execute(executable, params, callback) {

        var command = executable;

        _.each(params, function(value, key) {
            command = command + ' ' + ((value.indexOf(' ') !== -1) ? '"' + value + '"' : value);
        });

        if (options.verbose) {
            console.log(lb + 'Command: ' + command.green + lb);

            fields.select({
                title: 'What would you like me to do?',
                numbered: true,
                options: [{
                    label: 'Execute it',
                    value: 'execute'
                }, {
                    label: 'Save the original as a recipe (non-verbose)',
                    value: 'save'
                }, {
                    label: 'Exit',
                    value: 'exit'
                }]
            }).prompt(function(err, value) {

                if (err) {
                    console.error(lb + ('' + err)['red']);

                } else if (value === 'execute') {
                    spawn(executable, params);

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
                            console.error(lb + ('' + err)['red']);
                        } else {
                            console.log('');
                            recipes.set(value, args_original);
                        }

                        process.exit();
                    });

                } else {
                    process.exit();
                }
            });

        } else {

            logger.info('Executing: ' + command + lb);
            spawn(executable, params);
        }
    }

    function spawn(executable, params) {

        child_process.spawn(executable, params, {

            // So that Ti CLI can setRawMode
            stdio: 'inherit'
        });
    }

    if (options.titanium) {
        var executable = 'ti';

        if (options.build) {
            params.unshift('build');
        }

        if (options.sdk) {
            params.push('-s', options.sdk);
        }

        if (options.target) {
            params.push('-T', options.target);
        }

        if (options.family) {
            params.push('-F', options.family);
        }

        if (options.keystore) {
            params.push('-K', options.keystore);
        }

        if (options.output) {
            params.push('-O', options.output);
        }

        if (options.uuid) {
            params.push('-P', options.uuid);
        }

        if (options.certificate) {
            params.push((options.target === 'device') ? '-V' : '-R', options.certificate);
        }

        params.push('-p', options.platform);

        execute(executable, params);
    }
};