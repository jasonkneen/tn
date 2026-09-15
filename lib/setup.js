#!/usr/bin/env node

const path = require('path');
const { spawn } = require('child_process');

const { confirm } = require('@inquirer/prompts');

const logger = require('./logger'),
  recipes = require('./recipes'),
  simctl = require('./simctl'),
  utils = require('./utils'),
  chalk = require('chalk');

exports.uninstall = uninstall;
exports.generate = generate;
exports.pruneOrphanRecipes = pruneOrphanRecipes;

const PATH = path.resolve(__dirname, '..', 'hooks');

function uninstall() {
  logger.info('Uninstalling the old 2.x Titanium CLI hook..\n');

  const proc = spawn('ti', ['config', 'paths.hooks', '--remove', PATH], {
    stdio: 'inherit',
  });

  // this runs as a postinstall script, where a missing Titanium CLI is a normal
  // situation and must not fail the install with a stack trace
  proc.on('error', () => {
    logger.info('Titanium CLI not found, nothing to uninstall.');
  });
}

function generate() {
  logger.info('Looking up connected devices, emulators and simulators..');

  const tiProcess = spawn('ti', ['info', '-o', 'json'], { stdio: ['inherit', 'pipe', 'pipe'] });
  let stdout = '';
  let stderr = '';

  tiProcess.stdout.on('data', (data) => {
    stdout += data;
  });

  tiProcess.stderr.on('data', (data) => {
    stderr += data;
  });

  // spawn emits 'error' and then 'close' with a non-zero code for the same
  // failure; reporting both means two messages for one problem
  let spawnFailed = false;

  tiProcess.on('error', (err) => {
    spawnFailed = true;

    logger.error(
      err.code === 'ENOENT'
        ? 'Could not run ' + chalk.cyan('ti') + '. Is the Titanium CLI installed?'
        : 'Could not run ' + chalk.cyan('ti') + ': ' + err.message
    );
  });

  tiProcess.on('close', async (code) => {
    if (spawnFailed) {
      return;
    }

    if (code !== 0) {
      logger.error('Failed to read Titanium info: ' + JSON.stringify([code, stderr]));
    } else {
      console.log();

      // `ti info` exits 0 while printing something other than JSON often enough
      // (a banner, a warning, an update notice) that parsing it blind crashes
      // generate with a stack trace instead of a usable message.
      let config;

      try {
        config = JSON.parse(stdout);
      } catch (e) {
        logger.error('Could not read the output of ' + chalk.cyan('ti info -o json') + '.');
        logger.error(stdout.trim().split('\n')[0] || e.message);
        return;
      }
      // ti info reports simulators whose runtime was uninstalled as if they still
      // existed. simctl knows which ones are actually usable, so it wins here.
      const devices = await simctl.getDevices();
      const simctlUdids = devices ? simctl.activeUdids(devices) : null;
      const saved = [];
      const savedIds = new Set();
      const activeIosUdids = new Set();
      const activeAndroidIds = new Set();

      if (config.android) {
        if (config.android.emulators && config.android.emulators.length > 0) {
          config.android.emulators.forEach(function forEach(dev) {
            const name = androidName(dev.name);
            const emulatorId = dev.id || dev.name;
            const recipe = ['--android', '--emulator', '--device-id', emulatorId];

            activeAndroidIds.add(emulatorId);

            if (!recipes.has(name) || !arraysIdentical(recipes.get(name), recipe)) {
              saved.push(recipes.save(name, recipe, 'user', true));
            }
          });
        }

        if (config.android.devices && config.android.devices.length > 0) {
          config.android.devices.forEach(function forEach(dev) {
            const name = androidName(dev.name);
            const recipe = ['--android', '--device', '--device-id', dev.id];

            if (!recipes.has(name) || !arraysIdentical(recipes.get(name), recipe)) {
              saved.push(recipes.save(name, recipe, 'user', true));
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

            const name = dev.name
              .toLowerCase()
              .replace(/[()]/g, '')
              .replace(/[^a-z0-9]+/g, '-');

            const recipe = ['--ios', '--device', '--device-id', dev.udid];

            if (!recipes.has(name) || !arraysIdentical(recipes.get(name), recipe)) {
              saved.push(recipes.save(name, recipe, 'user', true));
            }
          });
        }

        if (config.ios.simulators) {
          let version;
          const versions = [];
          const simsByVersion = {};

          // Ti 5.0 has a ios and watch object
          const iosSims = config.ios.simulators.ios
            ? config.ios.simulators.ios
            : config.ios.simulators;

          for (version in iosSims) {
            // ti info still lists simulators whose runtime was uninstalled (ghosts).
            // Skip them or we would generate recipes that the orphan check below
            // immediately flags for removal, on every run.
            const sims = simctlUdids
              ? iosSims[version].filter((dev) => simctlUdids.has(dev.udid))
              : iosSims[version];

            if (sims.length === 0) {
              continue;
            }

            simsByVersion[version] = sims;
            versions.push(version);
          }

          // we want newest versoon first
          versions.sort();
          versions.reverse();

          versions.forEach(function forEach(version) {
            simsByVersion[version].forEach(function forEach(dev) {
              if (savedIds.has(dev.udid)) return;

              let name = dev.name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/-$/, '');
              const recipe = ['--ios', '--simulator', '--device-id', dev.udid];

              activeIosUdids.add(dev.udid);

              // Already saved, possibly as "<name>-ios186" from when the plain name
              // belonged to another simulator. Saving the plain name again once it is
              // free would leave two recipes launching the same simulator.
              if (recipes.findUserByArgs(recipe)) {
                savedIds.add(dev.udid);
                return;
              }

              if (recipes.has(name) && versions[0] !== version) {
                const existing = recipes.get(name);
                const existingId = existing[existing.indexOf('--device-id') + 1];
                if (existingId !== dev.udid) {
                  name = name + '-ios' + version.replace(/\./, '');
                }
              }

              if (!recipes.has(name) || !arraysIdentical(recipes.get(name), recipe)) {
                saved.push(recipes.save(name, recipe, 'user', true));
              }
              savedIds.add(dev.udid);
            });
          });
        }
      }

      if (saved.length === 0) {
        logger.info('All recipes are up to date.');
      } else {
        saved.forEach(({ recipe, args, clr }) => {
          console.log('  ' + recipe + ': ' + chalk[clr](utils.join(args)));
        });
        console.log();
      }

      // Only prune a platform whose inventory we actually managed to read. If ti info
      // never reported the platform (SDK not configured, wrong OS) its "active" set is
      // empty for the wrong reason, and every recipe would look orphaned.
      const iosActive = simctlUdids || (config.ios && config.ios.simulators ? activeIosUdids : null);
      const androidActive =
        config.android && Array.isArray(config.android.emulators) ? activeAndroidIds : null;

      await pruneOrphanRecipes(iosActive, androidActive);

      // Ghost simulators are skipped above, so without this line they would be
      // invisible: still on disk, never mentioned again.
      const ghosts = simctl.ghosts(devices);

      if (ghosts.length > 0) {
        console.log();
        logger.warn(
          ghosts.length + ' ghost simulators found — their runtime is no longer installed'
        );
        // aligned under the message, past the 8-character "[WARN]  " prefix
        console.log(
          '        Run  ' + chalk.cyan('tn clean') + '  to remove them and free up disk space.'
        );
        console.log();
      }

      logger.info('Done');
    }
  });
}

// Recipes pointing at a simulator or emulator that no longer exists. A null set
// means that platform could not be inspected, in which case it is left alone.
async function pruneOrphanRecipes(iosActive, androidActive) {
  const orphans = recipes.listOrphans(iosActive, androidActive);

  if (orphans.length === 0) {
    return;
  }

  logger.info(
    'Found ' + orphans.length + ' orphaned recipes (simulator or emulator no longer installed):'
  );
  orphans.forEach((name) => {
    console.log('  ' + chalk.red(name));
  });
  console.log();

  const shouldRemove = await confirm({
    message: 'Remove these orphaned recipes?',
    default: false,
  });

  if (shouldRemove) {
    orphans.forEach((name) => recipes.remove(name, 'user', true));
    logger.info('Removed ' + orphans.length + ' orphaned recipes.');
  } else {
    logger.info('Keeping orphaned recipes. Run again to clean up later.');
  }

  console.log();
}

// "Pixel 8 Pro API 34." -> "pixel-8-pro-api-34". The iOS names below are built
// slightly differently on purpose: changing either would rename the recipes
// people already have saved.
function androidName(name) {
  return name
    .toLowerCase()
    .replace(/\.+/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-$/, '');
}

function arraysIdentical(a, b) {
  let i = a.length;

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
