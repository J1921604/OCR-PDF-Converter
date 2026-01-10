const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = (env, argv) => {
  const isDev = argv?.mode === 'development';

  // 本番(=build)ではCSPを有効化。開発(webpack-dev-server)では拡張機能やHMRの接続で
  // 大量のCSP violationが出るため、meta CSPを無効化して開発体験を優先する。
  // ※ GitHub Pagesはレスポンスヘッダを設定できないため、本番ではmeta CSPを使う。
  const prodCsp = [
    "default-src 'self'",
    // wasm/worker で eval 相当を使う実装があり得るため許可
    "script-src 'self' 'unsafe-eval' 'wasm-unsafe-eval'",
    // PDF.js/Tesseract の worker は blob を使うケースがある
    "worker-src 'self' blob:",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    // Tesseractの言語データ取得
    "connect-src 'self' https://tessdata.projectnaptha.com",
  ].join('; ');

  return {
  entry: './src/index.jsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.[contenthash].js',
    clean: true,
    publicPath: process.env.PUBLIC_URL || '/',
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.jsx'],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html',
      filename: 'index.html',
      // devではnullにして、テンプレート側でmeta CSPを出さない
      csp: isDev ? null : prodCsp,
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'public/manifest.json', to: 'manifest.json' },
        { from: 'public/assets', to: 'assets', noErrorOnMissing: true },

        // PDF.js worker をローカル配信 (CDN依存を排除)
        {
          from: 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs',
          to: 'pdf.worker.min.mjs',
        },

        // Tesseract worker/core をローカル配信
        {
          from: 'node_modules/tesseract.js/dist/worker.min.js',
          to: 'assets/wasm/worker.min.js',
        },
        // core (非SIMD)
        {
          from: 'node_modules/tesseract.js-core/tesseract-core.wasm.js',
          to: 'assets/wasm/tesseract-core.wasm.js',
        },
        {
          from: 'node_modules/tesseract.js-core/tesseract-core.wasm',
          to: 'assets/wasm/tesseract-core.wasm',
        },
        {
          from: 'node_modules/tesseract.js-core/tesseract-core.js',
          to: 'assets/wasm/tesseract-core.js',
        },
        // 追加: SIMD/LSTM系 (環境判定で使われる可能性があるため同梱)
        {
          from: 'node_modules/tesseract.js-core/tesseract-core-simd.wasm.js',
          to: 'assets/wasm/tesseract-core-simd.wasm.js',
        },
        {
          from: 'node_modules/tesseract.js-core/tesseract-core-simd.wasm',
          to: 'assets/wasm/tesseract-core-simd.wasm',
        },
        {
          from: 'node_modules/tesseract.js-core/tesseract-core-simd.js',
          to: 'assets/wasm/tesseract-core-simd.js',
        },
        {
          from: 'node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js',
          to: 'assets/wasm/tesseract-core-lstm.wasm.js',
        },
        {
          from: 'node_modules/tesseract.js-core/tesseract-core-lstm.wasm',
          to: 'assets/wasm/tesseract-core-lstm.wasm',
        },
        {
          from: 'node_modules/tesseract.js-core/tesseract-core-lstm.js',
          to: 'assets/wasm/tesseract-core-lstm.js',
        },
        {
          from: 'node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js',
          to: 'assets/wasm/tesseract-core-simd-lstm.wasm.js',
        },
        {
          from: 'node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm',
          to: 'assets/wasm/tesseract-core-simd-lstm.wasm',
        },
        {
          from: 'node_modules/tesseract.js-core/tesseract-core-simd-lstm.js',
          to: 'assets/wasm/tesseract-core-simd-lstm.js',
        },
      ],
    }),
  ],
  devServer: {
    port: 3000,
    hot: true,
    open: false,
    historyApiFallback: true,
    setupExitSignals: false,
    client: {
      webSocketURL: {
        hostname: 'localhost',
        pathname: '/ws',
        port: 3000,
        protocol: 'ws',
      },
      logging: 'info',
      overlay: {
        errors: true,
        warnings: false,
      },
    },
    allowedHosts: 'all',
  },
  performance: {
    maxAssetSize: 5242880, // 5MB
    maxEntrypointSize: 5242880,
  },
  };
};
