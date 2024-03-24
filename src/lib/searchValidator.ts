export default function isCorrectSearch(title: string, keywords: string): boolean {
  if (
    title
      .trim()
      .toLowerCase()
      .includes(keywords.split(" ").slice(0, 2).join(" ").toLowerCase())
  ) {
    return true;
  } else {
    return false;
  }
}
