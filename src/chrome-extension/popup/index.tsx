import { Card, CardContent } from "../../components/ui/card";
import "../global.css";
import { ChevronRight } from "lucide-react";

export const Popup = () => {
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
