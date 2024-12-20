const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");
module.exports = {
	mode: "production",
	cache: false,
	entry: {
		content_script: path.resolve(__dirname, "..", "src", "content_script.ts"),
		background: path.resolve(__dirname, "..", "src", "background.ts"),
		popup: path.resolve(__dirname, "..", "src", "popup.ts"),
		parser: path.resolve(__dirname, "..", "src/lib", "parser.ts"),
		searchValidator: path.resolve(
			__dirname,
			"..",
			"src/lib",
			"searchValidator.ts"
		),
	},
	output: {
		path: path.join(__dirname, "../dist"),
		libraryTarget: "umd",
		filename: "[name].js",
		clean: true,
	},
	resolve: {
		extensions: [".ts", ".js"],
		fallback: {
			url: false,
			path: false,
			fs: false,
			canvas: false,
			util: false,
			net: false,
			tls: false,
			assert: false,
			string_decoder: false,
			vm: false,
			crypto: false,
			http: false,
			https: false,
			stream: false,
			zlib: false,
			os: false,
			child_process: false,
			buffer: false,
		},
	},
	optimization: {
		minimize: true,
		minimizer: [
			new TerserPlugin({
				parallel: true,
				terserOptions: {
					ecma: 6,
					output: {
						ascii_only: true,
					},
				},
			}),
		],
	},
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				loader: "ts-loader",
				exclude: /node_modules/,
			},
		],
	},
	plugins: [
		new CopyPlugin({
			patterns: [{ from: ".", to: ".", context: "public" }],
		}),
	],
};
