import {
	HTMLString,
	CarElement,
	ChannelRequest,
	SearchInfo,
} from "./background";
import Pagination from "./lib/pagination";
import Parser from "./lib/parser";
import isCorrectSearch from "./lib/searchValidator";

function findClosestAncestorWithClass(
	element: Element,
	className: string
): Element | null {
	if (element.classList.contains(className)) {
		return element;
	}

	// traverse the DOM tree upwards until a parent with the specified class is found
	while (element.parentElement) {
		element = element.parentElement;
		if (element.classList.contains(className)) {
			return element;
		}
	}
	return null;
}

function matchElement(
	elementArray: CarElement[],
	filterValue: string
): CarElement[] {
	const matchArray = elementArray.filter((elem) =>
		elem.title
			.split(" ") // TODO: split on other characters too (e.g. / ,)
			.map((word) => word.toLowerCase())
			.includes(filterValue.toLowerCase())
	);
	return matchArray ? matchArray : [];
}

// calculates the average price of the filtered elements in BGN
function calculateAvgPrice(elements: CarElement[]): number {
	if (!elements) return 0;
	let prices: number[] = [];
	for (let i = 0; i < elements.length; i++) {
		if (!elements[i].price.trim().startsWith("Запитване")) {
			const splitPrice = elements[i].price.trim().split(" ");
			let numPrice = parseInt(splitPrice.slice(0, 2).join(""));
			const currency = splitPrice.at(-1);
			if (currency?.toLowerCase() == "eur") {
				numPrice *= 2; // TODO: multiply by actual exchange rate
			}
			prices.push(numPrice);
		}
	}
	prices = prices.filter((elem) => elem);

	if (prices.length !== 0) {
		const avgPriceBGN = Math.round(
			prices.reduce((a, b) => a + b) / prices.length
		);
		return avgPriceBGN;
	}
	// it is possible that there are elements but they do not have prices in which case we return an everage of zero
	return 0;
}

function fullSearchKeywords(filterValue: string): string {
	const brandModel = document
		.querySelector('[name="search"] h1')
		?.textContent?.split(" ")
		.slice(2)
		.join(" ");
	return brandModel + " " + filterValue;
}

function populateWithFilteredElems(
	matchingElements: CarElement[],
	listingsWrapper: Element
) {
	// finding ancestor elements
	const filteredElements = matchingElements
		.map((elem) => findClosestAncestorWithClass(elem.element, "item"))
		.filter((elem) => elem) as Element[];

	listingsWrapper.replaceChildren(...filteredElements);
}

async function applyFilter(
	cars: CarElement[],
	request: any,
	port: chrome.runtime.Port
) {
	const carsMatchingFilter = matchElement(cars, request.filterValue as string);

	if (carsMatchingFilter.length === 0) {
		const warningMsg: ChannelRequest = {
			type: "warning",
			message: "no listings found",
		};
		port.postMessage(warningMsg);
		return;
	} else {
		const listingsWrapper = document.getElementsByClassName("ads2023")[0];
		populateWithFilteredElems(carsMatchingFilter, listingsWrapper);

		const avgPrice = calculateAvgPrice(carsMatchingFilter);

		const searchKeywords = fullSearchKeywords(request.filterValue as string); // this always has length of 3

		/*
    check if parsed car listings coincide with car brand and model extracted directly from the page;
    if url structure changes, it can happen that random urls are generated and car listings are extracted for brands and models
    that have nothing to do with the car and the brand you currently have loaded in front of you
    */
		if (!isCorrectSearch(carsMatchingFilter[0].title, searchKeywords)) {
			throw new Error("Parsed objects do not coincide with desired search.");
		}

		const filterElementsHTML = document.documentElement.innerHTML;

		const cacheItem: SearchInfo = {
			searchValue: request.filterValue,
			keywords: searchKeywords,
			filterAmount: carsMatchingFilter.length,
			avgPrice: avgPrice,
			filteredHtmlText: filterElementsHTML as HTMLString,
		};

		const populatePopupInterfaceReq: ChannelRequest = {
			type: "populatePopupInterface",
			message: JSON.stringify(cacheItem),
		};
		port.postMessage(populatePopupInterfaceReq);

		chrome.storage.local.get(["lastSearches"], function (result) {
			if (!result.lastSearches) {
				const cache: SearchInfo[] = [];
				cache.push(cacheItem);
				chrome.storage.local.set({ lastSearches: JSON.stringify(cache) });
			} else {
				let cachedSearches = JSON.parse(result.lastSearches);
				// creates a queue: first item is taken out if there are three or more items in the cache, and the new entry is being appended
				if (cachedSearches.length >= 3) {
					const shiftedCache = cachedSearches.slice(1).concat(cacheItem);
					chrome.storage.local.set({
						lastSearches: JSON.stringify(shiftedCache),
					});
				} else {
					cachedSearches.push(cacheItem);
					chrome.storage.local.set({
						lastSearches: JSON.stringify(cachedSearches),
					});
				}
			}
		});
	}
}
chrome.runtime.onConnect.addListener(function (port) {
	console.assert(port.name === "MOBILE_POPUP");
	// storing original page state so it can replace the filtered page when remove filter is called
	const originalHTML = document.documentElement.innerHTML;
	const pagination = new Pagination("pagination");
	port.onMessage.addListener(async function (request) {
		// TODO: create a union type for request states (successful, error, etc.) in background script
		if (request.type === "popuprequest") {
			switch (request.message) {
				case "filter":
					const parser = new Parser();
					const totalPages = pagination.getTotalAmountPages();
					const urlsToExtract = parser.createPaginationUrls(totalPages);
					const cars = await parser.extractAllListings(urlsToExtract);

					chrome.storage.local.get(["lastSearches"], async function (result) {
						if (result.lastSearches) {
							const cacheArray: SearchInfo[] = JSON.parse(result.lastSearches);
							for (let item = 0; item < cacheArray.length; item++) {
								/*
                  same search value can be used for different car brands and models, so the second condition
                  ensures that there is no cache hit if same search value has been cached but for different car brand
                  */
								if (
									cacheArray[item].keywords ===
									fullSearchKeywords(request.filterValue)
								) {
									document.documentElement.innerHTML =
										cacheArray[item].filteredHtmlText;
									const populateFromCacheReq: ChannelRequest = {
										type: "populatePopupInterface",
										message: JSON.stringify(cacheArray[item]),
									};
									port.postMessage(populateFromCacheReq);
									return;
								}
							}
						}
						await applyFilter(cars, request, port);
					});
					pagination.togglePaginationBars("hide");
					break;
				case "removefilter":
					pagination.togglePaginationBars("show");
					document.documentElement.innerHTML = originalHTML;
					const restoreReq: ChannelRequest = { type: "restoreElements" };
					port.postMessage(restoreReq);
					break;
				default:
					console.log("No message from popup.");
			}
		}
	});
});
