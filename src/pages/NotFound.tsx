import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { ArrowUpRight, MessageCircle } from "lucide-react";
import "@/components/home-v2/home-v2.css";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="home-v2 page">
      <div className="page-intro section-inner">
        <h1>404</h1>
        <p className="page-lede">Oops! Page not found</p>
        <a href="/" className="arrow-link mt-6">
          Return to Home <ArrowUpRight />
        </a>
      </div>

      <div className="page-section section-inner">
        <hr className="page-rule" />
        <div className="page-copy mt-8">
          <p className="text-foreground">Can't find what you're looking for?</p>
          <p>
            Contact us:
            <a href="tel:+918762988145" className="text-primary hover:text-primary/80 underline ml-2">
              +91 8762 988 145
            </a>
          </p>
          <p>
            or message us on
            <a href="https://wa.me/918762988145" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 underline ml-1 inline-flex items-center gap-1">
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
