import { CarElement } from "../background";
export default class Parser {
	async followLink(link: string): Promise<string | undefined> {
		try {
			const response = await fetch(link);

			if (!response.ok) {
				throw new Error(
					`Failed to fetch longer title of listing: ${response.status} ${response.statusText}`
				);
			}

			const decoder = new TextDecoder("windows-1251");
			const buffer = await response.arrayBuffer();
			const htmlString = decoder.decode(buffer);
			return htmlString;
		} catch (error) {
			console.error("Error fetching data:", error);
		}
	}

	parseTitleFromLink(html: string): string {
		const parser = new DOMParser();
		const doc = parser.parseFromString(html, "text/html");
		// getting title from follow link
		return doc.getElementsByTagName("h1")[0].textContent!;
	}
	createPaginationUrls(numPages: number): string[] {
		let paginationUrls = new Array<string>();
		for (let i = 1; i <= numPages; i++) {
			paginationUrls.push(window.location.href + `/p-${i}`);
		}
		return paginationUrls;
	}

	async createCarObjects(htmlText: string): Promise<CarElement[]> {
		const parser = new DOMParser();
		const doc = parser.parseFromString(htmlText, "text/html");

		const titleElements = doc.querySelectorAll(".title.saveSlink");
		const priceElements = doc.getElementsByClassName("price");
		const carObjList = new Array<CarElement>();
		for (let i = 0; i < titleElements.length; i++) {
			// first two elements with class mmm are not car elements so they are skipped over
			const titleElement = titleElements[i] as HTMLElement;
			let textContent = titleElement.textContent?.trim() ?? "empty";
			if (textContent.includes("...")) {
				const link = titleElement.getAttribute("href");
				if (link) {
					const html = await this.followLink(link);
					textContent = this.parseTitleFromLink(html!); // the three dots in a title obfuscate the full title, which is why we follow the link and parse the full title from the subsequent page
				}
			}
			carObjList.push({
				element: titleElement,
				title: textContent,
				price: priceElements[i].textContent!.trim(),
			});
		}

		return carObjList;
	}

	async extractAllListings(urls: string[]): Promise<CarElement[]> {
		let generalCarObject: Array<CarElement[]> = [];

		await Promise.all(
			urls.map(async (url) => {
				const response = await fetch(url);
				const decoder = new TextDecoder("windows-1251");
				const buffer = await response.arrayBuffer();
				const htmlString = decoder.decode(buffer);
				const cars = await this.createCarObjects(htmlString);
				generalCarObject.push(cars);
			})
		);
		return generalCarObject.flat(2);
	}
}
