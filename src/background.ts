interface SearchInfo {
  searchValue: string;
  keywords: string;
  filterAmount: number;
  avgPrice: number;
  filteredHtmlText: string;
}

interface ChannelRequest {
  type: "popuprequest";
  message: string;
}

interface FilterRequest extends ChannelRequest {
  filterValue: string;
}

interface CarElement {
  element: HTMLElement;
  title: string;
  price: string;
  currency?: "лв" | "EUR";
}
