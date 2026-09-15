const fs = require('fs');
const os = require('os');
const path = require('path');
const { EventEmitter } = require('events');

jest.mock('child_process', () => ({ spawn: jest.fn() }));
jest.mock('@inquirer/prompts', () => ({ confirm: jest.fn() }));
jest.mock('../lib/logger');
jest.mock('../lib/simctl', () => {
  const actual = jest.requireActual('../lib/simctl');
  return { ...actual, getDevices: jest.fn() };
});

const A = 'AAAAAAAA-0000-0000-0000-000000000000';
const B = 'BBBBBBBB-0000-0000-0000-000000000000';
const C = 'CCCCCCCC-0000-0000-0000-000000000000';
const GONE = 'DEADDEAD-0000-0000-0000-000000000000';

const sim = (udid, name) => ({ udid, name });
const recipe = udid => ['--ios', '--simulator', '--device-id', udid];

let home;
let cwd;

beforeEach(() => {
  jest.resetModules();
  home = fs.mkdtempSync(path.join(os.tmpdir(), 'tn-home-'));
  cwd = process.cwd();
  process.chdir(home);
});

afterEach(() => {
  process.chdir(cwd);
  fs.rmSync(home, { recursive: true, force: true });
});

// Runs `tn generate` against a fake `ti info` and `simctl`, with ~/.tn.json
// pointing at a temporary file, and returns the recipes it left on disk.
function generate(userRecipes, simulatorsByVersion) {
  const file = path.join(home, '.tn.json');
  fs.writeFileSync(file, JSON.stringify(userRecipes));

  const realHome = process.env.HOME;
  process.env.HOME = home;

  const { spawn } = require('child_process');
  const simctl = require('../lib/simctl');
  const logger = require('../lib/logger');
  const setup = require('../lib/setup');

  process.env.HOME = realHome;

  const udids = Object.values(simulatorsByVersion).flat();
  simctl.getDevices.mockResolvedValue(udids.map(s => ({ ...s, isAvailable: true })));

  spawn.mockImplementation(() => {
    const proc = new EventEmitter();
    proc.stdout = new EventEmitter();
    proc.stderr = new EventEmitter();

    setImmediate(() => {
      const info = { ios: { simulators: { ios: simulatorsByVersion } } };
      proc.stdout.emit('data', JSON.stringify(info));
      proc.emit('close', 0);
    });

    return proc;
  });

  return new Promise(resolve => {
    logger.info.mockImplementation(msg => {
      if (msg === 'Done') {
        resolve(JSON.parse(fs.readFileSync(file, 'utf8')));
      }
    });

    jest.spyOn(console, 'log').mockImplementation(() => {});
    setup.generate();
  });
}

test('does not add a second recipe for a simulator that already has one', async () => {
  const recipes = await generate(
    {
      'iphone-16-pro-max-ios186': recipe(A),
      'iphone-18-pro': recipe(B),
    },
    {
      18.6: [sim(A, 'iPhone 16 Pro Max')],
      '27.0': [sim(B, 'iPhone 18 Pro')],
    }
  );

  expect(recipes).toEqual({
    'iphone-16-pro-max-ios186': recipe(A),
    'iphone-18-pro': recipe(B),
  });
});

test('names a new simulator after the device, with the version when the name is taken', async () => {
  const recipes = await generate(
    { 'iphone-16-pro-max': recipe(A) },
    {
      18.6: [sim(A, 'iPhone 16 Pro Max'), sim(C, 'iPhone 16 Pro Max')],
      '27.0': [sim(B, 'iPhone 18 Pro')],
    }
  );

  expect(recipes).toEqual({
    'iphone-16-pro-max': recipe(A),
    'iphone-16-pro-max-ios186': recipe(C),
    'iphone-18-pro': recipe(B),
  });
});

test('points a recipe of the newest runtime at a recreated simulator', async () => {
  const recipes = await generate(
    { 'iphone-18-pro': recipe(GONE) },
    { '27.0': [sim(B, 'iPhone 18 Pro')] }
  );

  expect(recipes).toEqual({ 'iphone-18-pro': recipe(B) });
});
