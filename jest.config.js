module.exports = {
	verbose: true,
	setupFilesAfterEnv: ["@testing-library/jest-dom/extend-expect"],
	roots: ["<rootDir>/tests"],
	testMatch: ["**/__tests__/**/*.js", "**/*.(test|spec).[jt]s?(x)"],
	testEnvironment: "jsdom",
	transform: {
		"^.+\\.[tj]sx?$": "babel-jest",
	},
	setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
};
