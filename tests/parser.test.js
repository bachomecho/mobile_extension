import { JSDOM } from "jsdom";
import path from "path"
import fs from "fs"


const sampleHtmlPath = path.resolve(__dirname, "forTesting.html")
test('Check if HTML file was created', () => {
  expect(fs.existsSync(sampleHtmlPath)).toBe(true);
});

const sampleHtml = fs.readFileSync(
	sampleHtmlPath,
	"utf-8"
);
test('Ensure html file is not empty', () => {
  expect(sampleHtml.length).toBeGreaterThan(0);
});
const { document } = new JSDOM(sampleHtml, { contentType: "text/html" }).window;
describe("testing pagination parsing", () => {
	test("pagination element exists", () => {
		const paginationElement = document.querySelector(".pagination");
		expect(paginationElement).toBeInTheDocument();
	});
	test("total amount of pages exists (multi-page)", () => {
		const nOfPages = document
			.querySelector(".pagination")
			.querySelector(".saveSlink.gray").textContent;
		expect(Number(nOfPages)).toBeGreaterThan(1);
	});
	test("total amount of pages exists (single-page)", () => {
		const nOfPages = document
			.querySelector(".pagination")
			.querySelector(".saveSlink.selected").textContent;
		expect(Number(nOfPages)).toEqual(1);
	});
});
