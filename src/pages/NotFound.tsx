import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Phone, MessageCircle } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center max-w-md px-4">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Oops! Page not found</p>
        <a href="/" className="text-primary underline hover:text-primary/90 mb-6 inline-block">
          Return to Home
        </a>
        
        <div className="mt-6 p-4 bg-green-50 rounded border-2 border-green-300">
          <p className="text-base font-semibold text-gray-800 mb-3">Can't find what you're looking for?</p>
          <p className="text-base">
            Contact us: 
            <a href="tel:+918762988145" className="text-green-600 hover:text-green-900 underline font-bold ml-2 text-lg">
              +91 8762 988 145
            </a>
          </p>
          <p className="text-sm text-gray-600 mt-2">
            or message us on 
            <a href="https://wa.me/918762988145" target="_blank" rel="noopener noreferrer" className="text-green-600 hover:text-green-900 underline font-bold ml-1 inline-flex items-center gap-1">
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
