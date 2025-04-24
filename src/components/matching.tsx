export const matchedPrducts = (
  scrapedName: string,
  targetName: string
): boolean => {
  const commonWords = [
    "the",
    "and",
    "with",
    "from",
    "for",
    "of",
    "year",
    "old",
    "wiskey",
    "single",
    "malt",
    "scotch",
    "straight",
    "bourbon"
  ];

  // Get original tokens for debugging
  const scrapedTokens = scrapedName.toLowerCase().split(" ");
  const targetTokens = targetName.toLowerCase().split(" ");

  // Clean and tokenize both names, only excluding common words but keeping numbers
  const scrapedWords = scrapedTokens.filter(
    (word) =>
      word.length > 2 && !commonWords.includes(word)
  );

  const targetWords = targetTokens.filter(
    (word) =>
      word.length > 2 && !commonWords.includes(word)
  );

  if (scrapedWords.length === 0) {
    return false;
  }

  // Count matching words
  const matchingWords = scrapedWords.filter((word) =>
    targetWords.some(
      (targetWord) => targetWord.includes(word) || word.includes(targetWord)
    )
  );

  // Calculate match percentage including numeric words
  const matchPercentage = (matchingWords.length / scrapedWords.length) * 100;

  // Debugging output
  if (matchPercentage >= 20) {
    console.log(`Scraped Name: ${scrapedName}`);
    console.log(`Target Name: ${targetName}`);
    console.log(`Filtered Scraped Words: ${scrapedWords.join(", ")}`);
    console.log(`Filtered Target Words: ${targetWords.join(", ")}`);
    console.log(`Matching Words: ${matchingWords.join(", ")}`);
    console.log(`Match Percentage: ${matchPercentage.toFixed(2)}%`);
  }

  // Return true if match percentage is over 40%
  return matchPercentage >= 40;
};
