// `tn clean` — removes iOS simulator junk that Xcode leaves behind.
//
// Three separate jobs with three separate risk profiles, so three separate
// flags. Ghost simulators are useless by definition and are the default. Erased
// data comes back by reinstalling. A deleted runtime is a multi-gigabyte
// download, so it is never touched unless asked for by name.

const path = require('path');
const { spawn } = require('child_process');

const { confirm, checkbox } = require('@inquirer/prompts');

const chalk = require('chalk');

const logger = require('./logger'),
  setup = require('./setup'),
  simctl = require('./simctl');

exports.run = run;

const FLAGS = ['--ghosts', '--data', '--runtimes'];

async function run(argv) {
  const flags = argv || [];
  const unknown = flags.filter(flag => FLAGS.indexOf(flag) === -1);

  if (unknown.length > 0) {
    logger.error('Unknown option: ' + chalk.yellow(unknown.join(' ')));
    logger.info('Usage: tn clean [--ghosts] [--data] [--runtimes]');
    return;
  }

  const doData = flags.indexOf('--data') !== -1;
  const doRuntimes = flags.indexOf('--runtimes') !== -1;
  // no flags at all means the safe, common case
  const doGhosts = flags.indexOf('--ghosts') !== -1 || (!doData && !doRuntimes);

  if ((await simctl.getDevices()) === null) {
    logger.error('tn clean requires the Xcode command line tools on macOS');
    return;
  }

  // Data first, then runtimes, then ghosts: deleting a runtime creates new
  // ghosts, so sweeping them last catches everything in one pass.
  let deletedSimulators = false;

  if (doData) {
    await cleanData();
  }

  if (doRuntimes) {
    deletedSimulators = (await cleanRuntimes()) || deletedSimulators;
  }

  if (doGhosts) {
    deletedSimulators = (await cleanGhosts()) || deletedSimulators;
  }

  if (deletedSimulators) {
    const devices = await simctl.getDevices();

    // Android is not inspected here, so its set is unknown and its recipes are
    // left alone.
    await setup.pruneOrphanRecipes(devices ? simctl.activeUdids(devices) : null, null);
  }

  logger.info('Done');
}

async function cleanGhosts() {
  const devices = await simctl.getDevices();
  const ghosts = simctl.ghosts(devices);

  if (ghosts.length === 0) {
    logger.info('No ghost simulators found.');
    return false;
  }

  logger.info(
    'Found ' + ghosts.length + ' ghost simulators (their runtime is no longer installed):'
  );
  printByRuntime(ghosts);

  const bytes = await measure(ghosts);

  if (bytes !== null) {
    logger.info('They are using ' + chalk.yellow(formatSize(bytes)) + ' on disk.');
  }

  console.log();

  const ok = await confirm({ message: 'Delete these simulators?', default: false });

  if (!ok) {
    logger.info('Keeping ghost simulators.');
    return false;
  }

  return deleteGhosts(ghosts.length, bytes);
}

async function deleteGhosts(count, bytes) {
  const res = await simctl.exec(['delete', 'unavailable']);

  if (res.code !== 0) {
    logger.error('Failed to delete ghost simulators: ' + res.stderr.trim());
    return false;
  }

  logger.info(
    'Deleted ' +
      count +
      ' ghost simulators' +
      (bytes ? ', freeing ' + chalk.green(formatSize(bytes)) : '') +
      '.'
  );

  return true;
}

async function cleanData() {
  const devices = await simctl.getDevices();
  const live = (devices || []).filter(dev => dev.isAvailable);
  // A booted simulator is skipped rather than shut down: erasing what you are
  // actively using is not something a cleanup command should decide for you.
  const booted = live.filter(dev => dev.state === 'Booted');
  const targets = live.filter(dev => dev.state !== 'Booted');

  if (booted.length > 0) {
    logger.warn(
      'Skipping ' +
        booted.length +
        ' booted simulator(s): ' +
        booted.map(dev => dev.name).join(', ')
    );
  }

  if (targets.length === 0) {
    logger.info('No simulators to erase.');
    return false;
  }

  logger.info('This erases contents and settings of ' + targets.length + ' simulators.');
  logger.info(chalk.yellow('Installed apps and their data are deleted. The simulators are kept.'));

  const bytes = await measure(targets);

  if (bytes !== null) {
    logger.info('They are using ' + chalk.yellow(formatSize(bytes)) + ' on disk.');
  }

  console.log();

  const ok = await confirm({
    message: 'Erase contents and settings of ' + targets.length + ' simulators?',
    default: false,
  });

  if (!ok) {
    logger.info('Keeping simulator data.');
    return false;
  }

  // explicit UDIDs rather than `erase all`, so the booted ones stay skipped
  const res = await simctl.exec(['erase'].concat(targets.map(dev => dev.udid)));

  if (res.code !== 0) {
    logger.error('Failed to erase simulators: ' + res.stderr.trim());
    return false;
  }

  logger.info('Erased ' + targets.length + ' simulators.');
  return false;
}

async function cleanRuntimes() {
  const runtimes = await simctl.getRuntimes();

  if (runtimes === null) {
    logger.error('Failed to read installed runtimes.');
    return false;
  }

  const deletable = runtimes.filter(rt => rt.deletable);

  if (deletable.length === 0) {
    logger.info('No deletable runtimes found.');
    return false;
  }

  // counted before anything is deleted, so the summary can tell the simulators
  // this command orphaned apart from the ones that were already ghosts
  const ghostsBefore = simctl.ghosts(await simctl.getDevices()).length;

  deletable.sort((a, b) => compareVersions(b.version, a.version));

  console.log();

  const picked = await checkbox({
    message: 'Select runtimes to delete (nothing is selected by default):',
    choices: deletable.map(rt => ({
      name:
        rt.name +
        ' (' +
        rt.build +
        ') — ' +
        formatSize(rt.sizeBytes) +
        (rt.lastUsedAt ? ', last used ' + rt.lastUsedAt.slice(0, 10) : ''),
      value: rt.id,
    })),
  });

  if (picked.length === 0) {
    logger.info('No runtimes selected.');
    return false;
  }

  const chosen = deletable.filter(rt => picked.indexOf(rt.id) !== -1);
  const newest = newestPerPlatform(deletable);

  chosen.forEach(rt => {
    if (newest[rt.platform] === rt.id) {
      // rt.name is "iOS 26.5", so its first word is the platform label
      logger.warn(
        chalk.yellow(
          rt.name + ' is the newest ' + rt.name.split(' ')[0] + ' runtime you have installed.'
        )
      );
    }
  });

  const bytes = chosen.reduce((sum, rt) => sum + (rt.sizeBytes || 0), 0);

  console.log();
  logger.info('Re-downloading a runtime later takes several gigabytes and a while.');
  console.log();

  const ok = await confirm({
    message: 'Delete ' + chosen.length + ' runtime(s), freeing ' + formatSize(bytes) + '?',
    default: false,
  });

  if (!ok) {
    logger.info('Keeping runtimes.');
    return false;
  }

  const res = await simctl.exec(['runtime', 'delete'].concat(picked));

  if (res.code !== 0) {
    logger.error('Failed to delete runtimes: ' + res.stderr.trim());
    return false;
  }

  logger.info(
    'Deleted ' + chosen.length + ' runtime(s), freeing ' + chalk.green(formatSize(bytes)) + '.'
  );

  // Deleting a runtime turns its simulators into ghosts. Sweep them without
  // asking again: removing the runtime they depend on was already confirmed.
  const devices = await simctl.getDevices();
  const ghosts = simctl.ghosts(devices);

  if (ghosts.length === 0) {
    return true;
  }

  const orphaned = ghosts.length - ghostsBefore;

  logger.info(
    ghostsBefore > 0
      ? 'Removing ' +
          ghosts.length +
          ' unusable simulators (' +
          orphaned +
          ' left behind by the deleted runtime(s), ' +
          ghostsBefore +
          ' already ghosts)..'
      : 'Removing ' + orphaned + ' simulators left behind by the deleted runtime(s)..'
  );

  await deleteGhosts(ghosts.length, await measure(ghosts));

  return true;
}

function newestPerPlatform(runtimes) {
  const newest = {};

  runtimes.forEach(rt => {
    const current = newest[rt.platform];

    if (!current || compareVersions(rt.version, current.version) > 0) {
      newest[rt.platform] = rt;
    }
  });

  Object.keys(newest).forEach(platform => {
    newest[platform] = newest[platform].id;
  });

  return newest;
}

function compareVersions(a, b) {
  const left = String(a).split('.').map(Number);
  const right = String(b).split('.').map(Number);

  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const diff = (left[i] || 0) - (right[i] || 0);

    if (diff !== 0) {
      return diff;
    }
  }

  return 0;
}

function printByRuntime(devices) {
  const groups = {};

  devices.forEach(dev => {
    (groups[dev.runtime] = groups[dev.runtime] || []).push(dev);
  });

  Object.keys(groups)
    .sort()
    .forEach(runtime => {
      console.log('  ' + chalk.bold(runtime));
      groups[runtime].forEach(dev => {
        console.log('    ' + chalk.red(dev.name));
      });
    });

  console.log();
}

// simctl does not report per-device size, so shell out to du. Costs a few
// seconds over a large Devices folder, which is why generate() never does this.
async function measure(devices) {
  const paths = devices.filter(dev => dev.dataPath).map(dev => path.dirname(dev.dataPath));

  if (paths.length === 0) {
    return null;
  }

  logger.info('Calculating disk usage..');

  return dirSize(paths);
}

function dirSize(paths) {
  return new Promise(resolve => {
    const proc = spawn('du', ['-sk'].concat(paths), { stdio: ['ignore', 'pipe', 'ignore'] });
    let out = '';

    proc.stdout.on('data', data => {
      out += data;
    });

    proc.on('error', () => resolve(null));
    proc.on('close', () => {
      let total = 0;

      out.split('\n').forEach(line => {
        const kb = parseInt(line, 10);

        if (!isNaN(kb)) {
          total += kb;
        }
      });

      resolve(total * 1024);
    });
  });
}

function formatSize(bytes) {
  if (!bytes) {
    return '0 B';
  }

  const gb = bytes / 1024 / 1024 / 1024;

  if (gb >= 1) {
    return gb.toFixed(1) + ' GB';
  }

  return Math.round(bytes / 1024 / 1024) + ' MB';
}
