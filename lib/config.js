module.exports = {

  verbose: false,

  aliases: {
    android: {
      A: 'android-sdk',
      B: 'avd-abi',
      D: 'deploy-type',
      I: 'avd-id',
      K: 'keystore',
      L: 'alias',
      P: 'store-password',
      S: 'avd-skin'
    },
    blackberry: {
      A: 'ip-address',
      D: 'debug-token',
      K: 'keystore-password',
      N: 'ndk',
      P: 'password'
    },
    ios: {
      D: 'deploy-type',
      F: 'device-family',
      I: 'ios-version',
      K: 'keychain',
      P: 'pp-uuid',
      R: 'distribution-name',
      S: 'sim-version',
      V: 'developer-name',
      Y: 'sim-type'
    },
    mobileweb: {
      D: 'deploy-type'
    },
    shared: {
      C: 'device-id',
      O: 'output-dir',
      T: 'target',

      b: 'build-only',
      f: 'force',
      d: 'project-dir',
      p: 'platform',
      q: 'quiet',
      s: 'sdk'
    }

  }

};