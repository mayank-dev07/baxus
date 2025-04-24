import {  matchedPrducts } from "../../components/matching";
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



  const findMatchingProducts = (scrapedName: string, apiData: any[]): any[] => {
    if (!scrapedName || !apiData || apiData.length === 0) {
      return [];
    }
    
    const cleanedScrapedName = scrapedName.toLowerCase().trim();
    console.log("Searching for matches for:", cleanedScrapedName);
    
    const matches = apiData.filter(product => {
      const productName = product._source?.attributes?.Name || 
                         product._source?.name || 
                         "";
      
      if (!productName) return false;
      
      return matchedPrducts(cleanedScrapedName, productName.toLowerCase());
    });
    
    console.log("Matches found:", matches.map(p => p._source?.name || p._source?.attributes?.Name));
    
    return matches
  };

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

      if (h1Content && scrapedPrice) {

        const matches = findMatchingProducts(h1Content, data);

        console.log("Products:", matches);
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

          {h1Content && scrapedPrice ? (
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
                {isloading && h1Content && scrapedPrice ? (
                  <Card className="shadow-none border border-gray-200">
                    <CardContent className="p-0">
                      <div className="p-4">
                        <p className="text-black">
                          Fetching data from BAXUS marketplace...
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : h1Content && scrapedPrice && matchingProducts.length < 1 ? (
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
