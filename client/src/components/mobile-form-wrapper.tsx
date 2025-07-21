import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import { Link } from "wouter";

interface MobileFormWrapperProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  showHomeButton?: boolean;
}

export function MobileFormWrapper({ 
  title, 
  description, 
  children, 
  showHomeButton = true 
}: MobileFormWrapperProps) {
  return (
    <div className="min-h-screen bg-gray-900 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Mobile-Friendly Header with Home Button */}
        {showHomeButton && (
          <div className="flex items-center space-x-4 mb-6">
            <Link href="/">
              <Button variant="outline" size="sm" className="border-gray-600 text-gray-300 hover:bg-gray-700">
                <Home className="w-4 h-4 mr-2" />
                Home
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">{title}</h1>
              {description && (
                <p className="text-gray-400 mt-1 text-sm md:text-base">{description}</p>
              )}
            </div>
          </div>
        )}
        
        {/* Content */}
        <div className="space-y-6">
          {children}
        </div>
      </div>
    </div>
  );
}