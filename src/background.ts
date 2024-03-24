export interface SearchInfo {
  searchValue: string;
  keywords: string;
  filterAmount: number;
  avgPrice: number;
  filteredHtmlText: string;
}

export interface ChannelRequest {
  type: "popuprequest";
  message: string;
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
