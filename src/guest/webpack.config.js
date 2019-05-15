const path = require('path')
const ROOT_DIR = path.resolve(path.join(__dirname, '../../'))
const BIN_DIR = path.join(ROOT_DIR, 'bin')
const OUT_DIR = path.join(BIN_DIR, 'guest')
const OUT_FILENAME = 'guest.js'
const devRequire = (n) => require(path.join(ROOT_DIR, 'node_modules', n))
const webpackRequire = (n) => require(path.join(ROOT_DIR, 'webpack', n))

const CleanWebpackPlugin = devRequire('clean-webpack-plugin')
const { isVerboseLog } = webpackRequire('Config')
const DevTools = webpackRequire('DevTools')
const VanillaJavaScript = webpackRequire('VanillaJavaScript')

module.exports = function (env) {
  const config = {
    entry: path.join(__dirname, 'src/index.js'),
    output: {
      path: OUT_DIR,
      filename: OUT_FILENAME
    },
    externals: {
      'electron': 'commonjs electron',
      'fs': 'throw new Error("fs is not available")' // require('fs') is in hunspell-asm but it handles the failure gracefully :)
    },
    plugins: [
      new CleanWebpackPlugin({
        cleanOnceBeforeBuildPatterns: [ path.join(OUT_DIR, OUT_FILENAME) ],
        verbose: isVerboseLog,
        dry: false
      })
    ].filter((p) => !!p),
    resolve: {
      alias: {
        Adaptors: path.resolve(path.join(__dirname, 'src/Adaptors')),
        Browser: path.resolve(path.join(__dirname, 'src/Browser')),
        DispatchManager: path.resolve(path.join(__dirname, 'src/DispatchManager')),
        Extensions: path.resolve(path.join(__dirname, 'src/Extensions')),
        elconsole: path.resolve(path.join(__dirname, 'src/elconsole')),
        LiveConfig: path.resolve(path.join(__dirname, 'src/LiveConfig')),
        stores: path.resolve(path.join(__dirname, 'src/stores'))
      }
    }
  }

  VanillaJavaScript(__dirname, false, config)
  DevTools('WB Guest', env, config)
  return config
}
