export type HTMLString = string & { _brand: "html" };

export interface SearchInfo {
  searchValue: string;
  keywords: string;
  filterAmount: number;
  avgPrice: number;
  filteredHtmlText: HTMLString;
}

export interface ChannelRequest {
  type: string;
  message?: string;
}

export interface FilterRequest extends ChannelRequest {
  filterValue: string;
}

export interface CarElement {
  element: HTMLElement;
  title: string;
  price: string;
  currency?: "лв" | "EUR";
}
