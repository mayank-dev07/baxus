import { Card, CardContent } from "../../components/ui/card";
import "../global.css";
import { ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

export const Popup = () => {
  const [h1Content, setH1Content] = useState<string[]>([]);
  const [priceInfo, setPriceInfo] = useState<{selector: string, text: string} | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Function to extract the first price from a string that might contain multiple prices
  const extractFirstPrice = (priceText: string): string => {
    // Match price patterns like $10.99, €10,99, etc.
    const priceMatches = priceText.match(/(\$|€|£|¥)\s*\d+([.,]\d+)?/g);
    if (priceMatches && priceMatches.length > 0) {
      return priceMatches[0];
    }
    
    // If no currency symbol pattern found, try to match just numbers with decimal points
    // that might be prices (3+ digits or has decimal)
    const numberMatches = priceText.match(/\b\d{1,3}(,\d{3})*(\.\d{2})?\b/g);
    if (numberMatches && numberMatches.length > 0) {
      return numberMatches[0];
    }
    
    // Return the original if no clear price pattern found
    return priceText;
  };

  useEffect(() => {
    // Function to scrape h1 tags from the current active tab via background script
    const scrapeH1FromCurrentPage = () => {
      try {
        // Send message to background script
        chrome.runtime.sendMessage(
          { action: "scrapeH1" }, 
          (response) => {
            if (chrome.runtime.lastError) {
              setError("Error: " + chrome.runtime.lastError.message);
              setLoading(false);
              return;
            }

            if (response && response.success) {
              setH1Content(response.h1Content);
              setPriceInfo(response.priceInfo || null);
            } else {
              setError(response?.message || "Failed to scrape content");
            }
            setLoading(false);
          }
        );
      } catch (err) {
        setError("Error: " + (err instanceof Error ? err.message : String(err)));
        setLoading(false);
      }
    };

    scrapeH1FromCurrentPage();
  }, []);

  return (
    <div className="bg-white w-[400px] h-[500px]">
    <div className="max-w-md mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <div className="flex justify-center items-center text-2xl">
          <span className="font-semibold text-gray-800">BA</span>
          <img src="https://res.cloudinary.com/dgvnuwspr/image/upload/v1740441389/wdqjosbtpgjiyi1ovups.png" alt="" className="h-10 w-10"/>
          <span className="font-semibold text-gray-800">US</span>
          </div>
        </div>
        <button className="text-gray-500">
          <span className="block w-6 h-0.5 bg-gray-500 mb-1.5"></span>
          <span className="block w-6 h-0.5 bg-gray-500"></span>
        </button>
      </div>

      <>
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
        The Honey Barrel
        </h1>

        <div className="mb-6">
          <h2 className="text-xs font-medium text-[#b89d7a] mb-2 uppercase">
          Product Information
          </h2>
          <Card className="shadow-none border border-gray-200">
            <CardContent className="p-4">
              {loading ? (
                <p className="text-gray-500">Loading content...</p>
              ) : error ? (
                <p className="text-red-500">{error}</p>
              ) : (
                <div className="space-y-4">
                  {h1Content.length > 0 ? (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Product Name:</h3>
                      <div className="space-y-2">
                        {h1Content.map((content, index) => (
                          <div key={index} className="p-2 bg-gray-50 rounded-md">
                            <p className="font-medium text-gray-800">{content}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500">No product name found on this page</p>
                  )}
                  
                  {priceInfo ? (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Price Information:</h3>
                      <div className="p-2 bg-gray-50 rounded-md flex justify-between">
                        <p className="font-medium text-gray-800">
                          {extractFirstPrice(priceInfo.text)}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500">No price information found on this page</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

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
                <img src="https://res.cloudinary.com/dgvnuwspr/image/upload/v1740441389/wdqjosbtpgjiyi1ovups.png" alt="" className="h-5 w-5"/>
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
