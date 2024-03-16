interface SearchInfo {
  searchValue: string;
  keywords: string;
  filterAmount: number;
  avgPrice: number;
  filteredHtmlText: string;
}

interface CarElement {
  element: HTMLElement;
  title: string;
  price: string;
  currency?: "лв" | "EUR";
}
