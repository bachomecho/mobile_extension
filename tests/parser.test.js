import fs from "fs";
import { JSDOM } from "jsdom";
import path from "path";

const sampleHtml = fs.readFileSync(
	path.resolve(__dirname, "sample_response.html"),
	"utf-8"
);
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
