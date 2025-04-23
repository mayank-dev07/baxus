import { Card, CardContent } from "../../components/ui/card";
import "../global.css";
import { ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

export const Popup = () => {
  const [h1Content, setH1Content] = useState<string>("");
  const [priceInfo, setPriceInfo] = useState<{
    selector: string;
    text: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string>("");
  const [resData, setResData] = useState<any>();
  const [matchingProducts, setMatchingProducts] = useState<any[]>([]);
  const [scrapedPrice, setScrapedPrice] = useState<number | null>(null);
  const [isloading, setIsLoading] = useState(false);

  useEffect(() => {
    console.log("Current URL:", currentUrl);
    console.log("Scraped price:", scrapedPrice);
  }, [currentUrl, scrapedPrice]);

  const extractNumericPrice = (priceText: string): number | null => {
    const numericValue = priceText.replace(/[^0-9.]/g, "");
    return numericValue ? parseFloat(numericValue) : null;
  };

  useEffect(() => {
    console.log("ResData updated:", resData);
  }, [resData, matchingProducts]);

  const fetchData = async () => {
    console.log("Fetching data from API...");
    setIsLoading(true);
    setMatchingProducts([]);

    try {
      const response = await fetch(
        "https://services.baxus.co/api/search/listings?from=0&size=200&listed=true"
      );
      console.log("Response from API:", response);

      const data = await response.json();
      setResData(data);

      if (h1Content) {
        const scrapedName = h1Content.toLowerCase().trim();
        console.log("Scraped name:", scrapedName);
        console.log("API data:", data);

        const stopwords = [
          "the",
          "and",
          "a",
          "an",
          "of",
          "with",
          "in",
          "on",
          "by",
          "for",
          "to",
          "at",
          "from",
          "as",
          "is",
          "are",
          "was",
          "were",
          "&",
        ];

        const extractKeyElements = (text: string) => {
          const normalizedText = text
            .toLowerCase()
            .replace(/[^\w\s]/g, " ")
            .replace(/\s+/g, " ")
            .trim();

          const words = normalizedText
            .split(/\s+/)
            .filter((word) => word.length > 1 && !stopwords.includes(word));

          const firstFourWords = normalizedText
            .split(/\s+/)
            .filter((word) => word.length > 1 && !stopwords.includes(word))
            .slice(0, 4);

          const numbers = words.filter((word) => /\d+/.test(word));

          const textWords = words.filter((word) => !/\d+/.test(word));

          return {
            normalizedText,
            words,
            firstFourWords,
            numbers,
            textWords,
          };
        };

        const scrapedElements = extractKeyElements(scrapedName);

        const firstThreeLetters = scrapedName
          .toLowerCase()
          .replace(/[^\w]/g, "")
          .slice(0, 3);
        console.log("First three letters to match:", firstThreeLetters);

        const scrapedNameWords = scrapedName.toLowerCase().split(/\s+/);
        const importantScrapedTerms = scrapedNameWords.filter(
          (word: string) =>
            word.length > 3 && !stopwords.includes(word.toLowerCase())
        );

        const productMatches = data.map((product: any) => {
          const productNameWords = (product._source.name || "")
            .toLowerCase()
            .split(/\s+/);
          const importantProductTerms = productNameWords.filter(
            (word: string) =>
              word.length > 3 && !stopwords.includes(word.toLowerCase())
          );

          const matchingImportantTerms = importantScrapedTerms.filter(
            (term: string) =>
              importantProductTerms.some(
                (prodTerm: string) =>
                  prodTerm.includes(term) || term.includes(prodTerm)
              )
          );

          const significantTermMatch =
            matchingImportantTerms.length >= 2 ||
            (matchingImportantTerms.length > 0 &&
              matchingImportantTerms.length / importantScrapedTerms.length >=
                0.3);

          const productSources = [];

          if (product._source.name) {
            productSources.push(product._source.name);
          }

          if (
            product._source.attributes?.Name &&
            product._source.attributes.Name !== product._source.name
          ) {
            productSources.push(product._source.attributes.Name);
          }

          if (product._source.attributes?.Type) {
            productSources.push(product._source.attributes.Type);
          } else if (product._source.spiritType) {
            productSources.push(product._source.spiritType);
          } else if (product._source.type) {
            productSources.push(product._source.type);
          }

          if (product._source.attributes?.Producer) {
            productSources.push(product._source.attributes.Producer);
          }

          if (product._source.attributes?.Age) {
            productSources.push(`${product._source.attributes.Age} Year`);
          }

          const productElements = productSources.map((source) =>
            extractKeyElements(source)
          );

          const productTypes: string[] = [];

          if (product._source.spiritType) {
            productTypes.push(product._source.spiritType.toLowerCase());
          }

          if (product._source.type) {
            productTypes.push(product._source.type.toLowerCase());
          }

          if (product._source.attributes?.Type) {
            productTypes.push(product._source.attributes.Type.toLowerCase());
          }

          const scrapedTerms = scrapedElements.textWords;

          const categoryMatchScore = scrapedTerms.some((term) =>
            productTypes.some((type) => type.includes(term))
          )
            ? 1
            : 0;

          const reverseMatchScore = productTypes.some((type) =>
            scrapedTerms.some(
              (term) => term.includes(type) || type.includes(term)
            )
          )
            ? 1
            : 0;

          const scrapedNumbers = scrapedName.match(/\d+/g) || [];
          const productNumbers = product._source.name.match(/\d+/g) || [];

          const matchingNumbers = scrapedNumbers.filter((num) =>
            productNumbers.includes(num)
          );

          const hasMatchingNumbers = matchingNumbers.length > 0;

          const categoryMismatch =
            categoryMatchScore === 0 &&
            reverseMatchScore === 0 &&
            productTypes.length > 0 &&
            scrapedTerms.length > 0 &&
            !significantTermMatch &&
            !hasMatchingNumbers;

          const firstThreeLettersMatch =
            firstThreeLetters.length >= 3 &&
            productSources.some((source) => {
              const normalized = source.toLowerCase().replace(/[^\w]/g, "");
              return normalized.includes(firstThreeLetters);
            });

          const wordStartMatch = importantScrapedTerms.some(
            (scrapedTerm: string) => {
              if (scrapedTerm.length < 3) return false;
              const firstFewLetters = scrapedTerm.slice(0, 3);
              return importantProductTerms.some(
                (productTerm: string) =>
                  productTerm.startsWith(firstFewLetters) ||
                  scrapedTerm.startsWith(productTerm.slice(0, 3))
              );
            }
          );

          if (
            categoryMismatch &&
            !firstThreeLettersMatch &&
            !wordStartMatch &&
            !hasMatchingNumbers
          ) {
            return {
              product,
              score: 0,
              hasFirstThreeLetters: false,
              wordStartMatch,
              hasMatchingNumbers,
              categoryMismatch: true,
              productKey: product._id || product._source.id,
              productTypes,
              wordMatchCount: 0,
            };
          }

          const numberMatchBonus = hasMatchingNumbers ? 0.6 : 0;
          const termMatchBonus = significantTermMatch ? 0.3 : 0;
          const firstThreeLettersBonus =
            firstThreeLettersMatch || wordStartMatch ? 0.4 : 0;

          const combinedProductElements = {
            normalizedText: productElements
              .map((pe) => pe.normalizedText)
              .join(" "),
            words: [...new Set(productElements.flatMap((pe) => pe.words))],
            numbers: [...new Set(productElements.flatMap((pe) => pe.numbers))],
            textWords: [
              ...new Set(productElements.flatMap((pe) => pe.textWords)),
            ],
            firstFourWords:
              productElements.length > 0
                ? productElements[0].firstFourWords
                : [],
          };

          let firstFourWordsMatchCount = 0;
          if (scrapedElements.firstFourWords.length > 0) {
            scrapedElements.firstFourWords.forEach((word) => {
              if (
                combinedProductElements.words.some(
                  (prodWord) =>
                    prodWord.includes(word) || word.includes(prodWord)
                )
              ) {
                firstFourWordsMatchCount++;
              }
            });
          }

          const firstFourWordsMatchScore =
            scrapedElements.firstFourWords.length > 0
              ? firstFourWordsMatchCount / scrapedElements.firstFourWords.length
              : 0;

          const firstFourWordsBonus =
            firstFourWordsMatchScore > 0.5
              ? 0.8
              : firstFourWordsMatchScore > 0.25
              ? 0.4
              : 0;

          let directMatchScore = 0;
          const scrapedInProduct =
            combinedProductElements.normalizedText.includes(
              scrapedElements.normalizedText
            );
          const productInScraped = scrapedElements.normalizedText.includes(
            combinedProductElements.normalizedText
          );

          if (scrapedInProduct || productInScraped) {
            directMatchScore = scrapedInProduct ? 0.9 : 0.7;
          }

          // Extract all distinct words from the scraped name and product
          const scrapedWordsSet = new Set(
            scrapedElements.words.map((w) => w.toLowerCase())
          );
          const productWordsSet = new Set(
            combinedProductElements.words.map((w) => w.toLowerCase())
          );

          // Find exact word matches (complete words that match exactly, not substrings)
          const exactMatchedWords = [...scrapedWordsSet].filter((word) =>
            productWordsSet.has(word)
          );

          // Count of exact word matches (for the 4-word minimum requirement)
          const exactWordMatchCount = exactMatchedWords.length;

          const matchedWords = scrapedElements.words.filter((word) =>
            combinedProductElements.words.includes(word)
          );
          const wordMatchScore =
            scrapedElements.words.length > 0
              ? matchedWords.length / scrapedElements.words.length
              : 0;

          const wordMatchCount = matchedWords.length;

          const matchedNumbers = scrapedElements.numbers.filter((num) =>
            combinedProductElements.numbers.includes(num)
          );
          const numberMatchScore =
            scrapedElements.numbers.length > 0
              ? matchedNumbers.length / scrapedElements.numbers.length
              : 1;

          const matchedTextWords = scrapedElements.textWords.filter((word) =>
            combinedProductElements.textWords.includes(word)
          );
          const textWordMatchScore =
            scrapedElements.textWords.length > 0
              ? matchedTextWords.length / scrapedElements.textWords.length
              : 0;

          let fuzzyMatchCount = 0;
          scrapedElements.textWords.forEach((scrapedWord) => {
            if (
              !combinedProductElements.textWords.includes(scrapedWord) &&
              scrapedWord.length >= 3
            ) {
              combinedProductElements.textWords.forEach((productWord) => {
                if (productWord.length >= 3) {
                  if (
                    productWord.includes(scrapedWord) ||
                    scrapedWord.includes(productWord)
                  ) {
                    fuzzyMatchCount += 0.5;
                  } else {
                    const overlapChars = scrapedWord
                      .split("")
                      .filter((c: string) => productWord.includes(c)).length;
                    const overlapRatio =
                      overlapChars /
                      Math.max(scrapedWord.length, productWord.length);

                    if (overlapRatio > 0.6) {
                      fuzzyMatchCount += 0.3;
                    }
                  }
                }
              });
            }
          });

          const fuzzyMatchScore =
            scrapedElements.textWords.length > 0
              ? fuzzyMatchCount / scrapedElements.textWords.length
              : 0;

          let totalScore = 0;

          if (directMatchScore > 0) {
            totalScore =
              directMatchScore + firstThreeLettersBonus + firstFourWordsBonus;
          } else {
            const numberWeight = scrapedElements.numbers.length > 0 ? 0.5 : 0.1;
            const textWordWeight = 0.4;
            const fuzzyWeight = 0.1;
            const firstFourWordsWeight = 0.7;

            totalScore =
              numberMatchScore * numberWeight +
              textWordMatchScore * textWordWeight +
              fuzzyMatchScore * fuzzyWeight +
              firstThreeLettersBonus +
              numberMatchBonus +
              termMatchBonus +
              firstFourWordsMatchScore * firstFourWordsWeight;
          }

          if (
            wordMatchScore > 0.6 ||
            hasMatchingNumbers ||
            firstFourWordsMatchScore > 0.5
          ) {
            totalScore = Math.max(
              totalScore,
              wordMatchScore * 0.6 +
                firstThreeLettersBonus +
                numberMatchBonus +
                firstFourWordsMatchScore * 0.8
            );
          }

          const matchReport = {
            firstThreeLettersMatch: firstThreeLettersMatch ? "Yes" : "No",
            firstFourWordsMatch: `${(firstFourWordsMatchScore * 100).toFixed(
              1
            )}%`,
            directMatch: directMatchScore > 0 ? "Yes" : "No",
            wordMatchPercent: `${(wordMatchScore * 100).toFixed(1)}%`,
            wordMatchCount: wordMatchCount,
            exactWordMatchCount: exactWordMatchCount,
            numberMatchPercent: `${(numberMatchScore * 100).toFixed(1)}%`,
            textWordMatchPercent: `${(textWordMatchScore * 100).toFixed(1)}%`,
            fuzzyMatchPercent: `${(fuzzyMatchScore * 100).toFixed(1)}%`,
            totalScore: `${(totalScore * 100).toFixed(1)}%`,
          };

          console.log(`Match for "${product._source.name}":`, matchReport);

          return {
            product,
            score: totalScore,
            wordMatchCount,
            exactWordMatchCount,
            hasFirstThreeLetters: firstThreeLettersMatch,
            firstFourWordsMatchScore,
            hasMatchingNumbers,
            matchReport,
            productKey: product._id || product._source.id,
          };
        });

        const validMatches =
          firstThreeLetters.length >= 3
            ? productMatches.filter(
                (match: any) => match.hasFirstThreeLetters || match.score > 0.5
              )
            : productMatches;

        const effectiveMatches =
          validMatches.length > 0 ? validMatches : productMatches;

        const sortedScores = effectiveMatches
          .map((match: any) => match.score)
          .sort((a: number, b: number) => b - a);

        let threshold = 0.25;

        if (sortedScores.length > 0) {
          const bestScore = sortedScores[0];

          if (bestScore > 0.8) {
            threshold = 0.5;
          } else if (bestScore > 0.6) {
            threshold = 0.35;
          } else if (bestScore > 0.4) {
            threshold = 0.25;
          }
        }

        const hasFirstFourMatches = effectiveMatches.some(
          (match: any) =>
            match.firstFourWordsMatchScore &&
            match.firstFourWordsMatchScore > 0.5
        );

        if (hasFirstFourMatches) {
          threshold = Math.min(threshold, 0.2);
        }

        const matches = effectiveMatches
          .filter((match: any) => match.exactWordMatchCount >= 4)
          .filter((match: any) => !match.categoryMismatch)
          .filter(
            (item: any, index: number, self: any[]) =>
              index ===
              self.findIndex((t: any) => t.productKey === item.productKey)
          )
          .sort((a: any, b: any) => {
            const aWordCount = a.exactWordMatchCount || 0;
            const bWordCount = b.exactWordMatchCount || 0;

            if (Math.abs(aWordCount - bWordCount) >= 2) {
              return bWordCount - aWordCount;
            }

            const aFirstFourScore = a.firstFourWordsMatchScore || 0;
            const bFirstFourScore = b.firstFourWordsMatchScore || 0;

            const aHasNumbers = a.hasMatchingNumbers ? 1 : 0;
            const bHasNumbers = b.hasMatchingNumbers ? 1 : 0;

            if (Math.abs(aFirstFourScore - bFirstFourScore) < 0.2) {
              if (aHasNumbers !== bHasNumbers) {
                return bHasNumbers - aHasNumbers;
              }
              return b.score - a.score;
            }

            return bFirstFourScore - aFirstFourScore;
          })
          .slice(0, 5)
          .map((match: any) => match.product);

        console.log("Matching products:", matches);
        setMatchingProducts(matches);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, [h1Content]);

  useEffect(() => {
    if (matchingProducts.length > 0) setIsLoading(false);
    setTimeout(() => {
      if (matchingProducts.length < 1) {
        setIsLoading(false);
      }
    }, 10000);
  }, [matchingProducts]);

  const scrapePageData = () => {
    setLoading(true);
    setError(null);

    try {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        if (!activeTab || !activeTab.id) {
          setError("No active tab found");
          setLoading(false);
          return;
        }

        if (activeTab.url) {
          setCurrentUrl(activeTab.url);
        }

        chrome.tabs.sendMessage(
          activeTab.id,
          { action: "scrapeH1" },
          (response) => {
            if (chrome.runtime.lastError) {
              setError("Error: " + chrome.runtime.lastError.message);
              setLoading(false);
              return;
            }

            if (response && response.success) {
              setH1Content(response.h1Content[0] || "");
              setPriceInfo(response.priceInfo || null);
              if (response.priceInfo?.text) {
                const price = extractNumericPrice(response.priceInfo.text);
                setScrapedPrice(price);
              }
            } else {
              setError(response?.message || "Failed to scrape content");
            }
            setLoading(false);
          }
        );
      });
    } catch (err) {
      setError("Error: " + (err instanceof Error ? err.message : String(err)));
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleContentChange = (message: any) => {
      if (message.action === "contentChanged") {
        scrapePageData();
      }
    };

    chrome.runtime.onMessage.addListener(handleContentChange);

    return () => {
      chrome.runtime.onMessage.removeListener(handleContentChange);
    };
  }, []);

  useEffect(() => {
    scrapePageData();
  }, []);

  return (
    <div className="bg-white w-[400px] h-[500px] overflow-y-auto">
      <div className="max-w-md mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <div className="flex justify-center items-center text-2xl">
              <span className="font-semibold text-gray-800">BA</span>
              <img
                src="https://res.cloudinary.com/dgvnuwspr/image/upload/v1740441389/wdqjosbtpgjiyi1ovups.png"
                alt=""
                className="h-10 w-10"
              />
              <span className="font-semibold text-gray-800">US</span>
            </div>
          </div>
          <button
            onClick={scrapePageData}
            className="text-gray-500"
            title="Refresh data"
          >
            <span className="block w-6 h-0.5 bg-gray-500 mb-1.5"></span>
            <span className="block w-6 h-0.5 bg-gray-500"></span>
          </button>
        </div>

        <>
          <h1 className="text-2xl font-bold text-gray-800 mb-6 capitalize">
            {h1Content || "Product Information"}
          </h1>

          {h1Content && priceInfo ? (
            <div className="mb-6">
              <h2 className="text-xs font-medium text-[#b89d7a] mb-2 uppercase">
                Product Information
              </h2>
              <Card className="shadow-none border border-gray-200">
                <CardContent className="p-4">
                  {loading ? (
                    <p className="text-gray-500">Loading content...</p>
                  ) : error ? (
                    <p className="text-black">
                      Reload the page to use the extension
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {h1Content ? (
                        <div>
                          <h3 className="text-sm font-medium text-gray-700 mb-2">
                            Product Name:
                          </h3>
                          <div className="p-2 bg-gray-50 rounded-md">
                            <p className="font-medium text-gray-800">
                              {h1Content}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-500">
                          No product name found on this page
                        </p>
                      )}

                      {priceInfo ? (
                        <div>
                          <h3 className="text-sm font-medium text-gray-700 mb-2">
                            Price Information:
                          </h3>
                          <div className="p-2 bg-gray-50 rounded-md flex justify-between">
                            <p className="font-medium text-gray-800">
                              {priceInfo.text}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-500">
                          No price information found on this page
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="mb-6">
              <h2 className="text-xs font-medium text-[#b89d7a] mb-2 uppercase">
                Product Information
              </h2>

              <Card className="shadow-none border border-gray-200">
                <CardContent className="p-4">
                  <p className="text-black">
                    No product information found on this page. Open a product
                    page to use the extension.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {matchingProducts.length > 0 ? (
            <div className="mb-6">
              <h2 className="text-xs font-medium text-[#b89d7a] mb-2 uppercase">
                Price Comparison
              </h2>
              <Card className="shadow-none border border-gray-200">
                <CardContent className="p-0">
                  {matchingProducts.map((product, index) => (
                    <div
                      key={index}
                      className="p-4 border-b border-gray-200 last:border-b-0"
                    >
                      <div className="flex items-center gap-4">
                        {product._source?.imageUrl && (
                          <img
                            src={product._source.imageUrl}
                            alt={product._source.name}
                            className="w-16 h-16 object-cover rounded"
                          />
                        )}
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-800">
                            {product._source.name}
                          </h3>
                          <div className="flex items-center gap-2">
                            {product._source.price && (
                              <p className="text-[#b89d7a] font-medium">
                                ${product._source.price.toFixed(2)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-xs font-medium text-[#b89d7a] mb-2 uppercase">
                  Price Comparison
                </h2>
                {isloading && h1Content ? (
                  <Card className="shadow-none border border-gray-200">
                    <CardContent className="p-0">
                      <div className="p-4">
                        <p className="text-black">
                          Fetching data from BAXUS marketplace...
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : h1Content && matchingProducts.length < 1 ? (
                  <Card className="shadow-none border border-gray-200">
                    <CardContent className="p-0">
                      <div className="p-4">
                        <p className="text-black">No products found.</p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  matchingProducts.length < 1 && (
                    <Card className="shadow-none border border-gray-200">
                      <CardContent className="p-0">
                        <div className="p-4">
                          <p className="text-black">
                            Search for a product to see price comparisons.
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )
                )}
              </div>
            </>
          )}

          <div className="mb-6">
            <h2 className="text-xs font-medium text-[#b89d7a] mb-2 uppercase">
              Explore the marketplace
            </h2>
            <Card className="shadow-none border border-gray-200">
              <CardContent className="p-0">
                <a
                  href="https://www.baxus.co/"
                  target="_blank"
                  className="w-full flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src="https://res.cloudinary.com/dgvnuwspr/image/upload/v1740441389/wdqjosbtpgjiyi1ovups.png"
                      alt=""
                      className="h-5 w-5"
                    />
                    <span className="font-medium text-gray-800">BAXUS</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </a>
              </CardContent>
            </Card>
          </div>
        </>
      </div>
    </div>
  );
};
