// Thin wrapper around `xcrun simctl`.
//
// Every lookup resolves to null on any failure (no Xcode, not macOS, unreadable
// JSON) instead of throwing, so each caller decides what "we could not find out"
// means for it. That distinction matters: an empty list means "nothing is
// installed", null means "we have no idea", and treating the second as the first
// is how you end up offering to delete recipes that are perfectly fine.

const { spawn } = require('child_process');

exports.exec = exec;
exports.getDevices = getDevices;
exports.getRuntimes = getRuntimes;
exports.activeUdids = activeUdids;
exports.ghosts = ghosts;

function exec(args) {
  return new Promise(resolve => {
    const proc = spawn('xcrun', ['simctl'].concat(args), {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', data => {
      stdout += data;
    });

    proc.stderr.on('data', data => {
      stderr += data;
    });

    proc.on('error', () => resolve({ code: -1, stdout: '', stderr: 'xcrun not found' }));
    proc.on('close', code => resolve({ code, stdout, stderr }));
  });
}

async function json(args) {
  const res = await exec(args.concat(['--json']));

  if (res.code !== 0) {
    return null;
  }

  try {
    return JSON.parse(res.stdout);
  } catch (e) {
    return null;
  }
}

// Flattens the runtime-keyed device map into a single list. Returns null if
// simctl could not be queried.
async function getDevices() {
  const data = await json(['list', 'devices']);

  if (!data || !data.devices) {
    return null;
  }

  const devices = [];

  Object.keys(data.devices).forEach(runtime => {
    data.devices[runtime].forEach(dev => {
      devices.push({
        udid: dev.udid,
        name: dev.name,
        state: dev.state,
        // ioslib ignores isAvailable ("cannot be trusted") but on modern Xcode it
        // is what tells a real simulator apart from one whose runtime was removed.
        isAvailable: dev.isAvailable === true,
        dataPath: dev.dataPath,
        runtime: runtimeLabel(runtime),
      });
    });
  });

  return devices;
}

async function getRuntimes() {
  const data = await json(['runtime', 'list']);

  if (!data) {
    return null;
  }

  return Object.keys(data).map(id => {
    const rt = data[id];

    return {
      id: id,
      version: rt.version,
      build: rt.build,
      platform: rt.platformIdentifier,
      name: runtimeLabel(rt.runtimeIdentifier || id),
      sizeBytes: rt.sizeBytes,
      lastUsedAt: rt.lastUsedAt,
      deletable: rt.deletable !== false,
    };
  });
}

function activeUdids(devices) {
  const udids = new Set();

  (devices || []).forEach(dev => {
    if (dev.isAvailable) {
      udids.add(dev.udid);
    }
  });

  return udids;
}

function ghosts(devices) {
  return (devices || []).filter(dev => !dev.isAvailable);
}

// com.apple.CoreSimulator.SimRuntime.iOS-26-4 -> iOS 26.4
function runtimeLabel(identifier) {
  const tail = String(identifier).split('.').pop();
  const parts = tail.match(/^([A-Za-z]+)-(.+)$/);

  return parts ? parts[1] + ' ' + parts[2].replace(/-/g, '.') : identifier;
}
