export  const matchedPrducts = (scrapedName: string, targetName: string): boolean => {
    const scrapedWords = scrapedName.toLowerCase().split(' ');
    const targetWords = targetName.toLowerCase();
    
    const significantScrapedWords = scrapedWords
      .filter(word => word.length > 2 && !['the', 'and', 'with', 'from', 'for', 'of'].includes(word))
      .slice(0, 3);
    
    if (significantScrapedWords.length === 0) {
      return false;
    }
    
    return significantScrapedWords.every(word => targetWords.includes(word));
  };