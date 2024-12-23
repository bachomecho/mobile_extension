import { IPagination } from "../background";

export default class Pagination implements IPagination {
	paginationWrapperClassName: string;
	paginationBars: HTMLCollectionOf<Element>;

	constructor(paginationWrapperClassName: string) {
		this.paginationWrapperClassName = paginationWrapperClassName;
		this.paginationBars = document.getElementsByClassName(
			paginationWrapperClassName
		);
	}
	getFirstPaginationBarElement(): HTMLElement {
		return this.paginationBars[0] as HTMLElement;
	}
	togglePaginationBars(toggleMethod: "show" | "hide") {
		for (const elem of this.paginationBars) {
			switch (toggleMethod) {
				case "show":
					(elem as HTMLElement).style.display = "inline";
					break;
				case "hide":
					(elem as HTMLElement).style.display = "none";
					break;
				default:
					break;
			}
		}
	}
	getTotalAmountPages(): number {
		let totalPageElement: Element | null =
			this.getFirstPaginationBarElement().querySelector(".saveSlink.gray") ??
			this.getFirstPaginationBarElement().querySelector(".saveSlink.selected");
		return parseInt(totalPageElement?.textContent!);
	}
}
