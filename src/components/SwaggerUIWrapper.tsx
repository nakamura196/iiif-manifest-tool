'use client';

import { Suspense, useEffect } from 'react';
import dynamic from 'next/dynamic';
import 'swagger-ui-react/swagger-ui.css';

// Dynamically import SwaggerUI without SSR
const SwaggerUI = dynamic(() => import('swagger-ui-react'), { 
  ssr: false,
  loading: () => <div className="p-8 text-center">Loading API Documentation...</div>
});

interface SwaggerUIWrapperProps {
  spec: object;
  requestInterceptor: (req: { url: string; headers: Record<string, string> }) => { url: string; headers: Record<string, string> };
  withCredentials?: boolean;
  persistAuthorization?: boolean;
  docExpansion?: string;
  defaultModelsExpandDepth?: number;
  displayRequestDuration?: boolean;
  filter?: boolean;
  showExtensions?: boolean;
  showCommonExtensions?: boolean;
  tryItOutEnabled?: boolean;
}

// Wrapper component that disables React.StrictMode for SwaggerUI
export default function SwaggerUIWrapper(props: SwaggerUIWrapperProps) {
  // Suppress console warnings for known Swagger UI issues
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const originalError = console.error;
      const originalWarn = console.warn;
      
      // Override console.error
      console.error = (...args: unknown[]) => {
        const firstArg = args[0];
        if (typeof firstArg === 'string' && (
          firstArg.includes('UNSAFE_componentWillReceiveProps') ||
          firstArg.includes('ModelCollapse') ||
          firstArg.includes('OperationContainer') ||
          firstArg.includes('componentWillMount') ||
          firstArg.includes('componentWillReceiveProps')
        )) {
          // Suppress specific warnings from Swagger UI
          return;
        }
        originalError.apply(console, args);
      };
      
      // Override console.warn
      console.warn = (...args: unknown[]) => {
        const firstArg = args[0];
        if (typeof firstArg === 'string' && (
          firstArg.includes('UNSAFE_') ||
          firstArg.includes('ModelCollapse') ||
          firstArg.includes('OperationContainer')
        )) {
          // Suppress specific warnings from Swagger UI
          return;
        }
        originalWarn.apply(console, args);
      };
      
      // Cleanup function to restore original console methods
      return () => {
        console.error = originalError;
        console.warn = originalWarn;
      };
    }
  }, []);

  return (
    <Suspense fallback={<div className="p-8 text-center">Loading API Documentation...</div>}>
      <div className="swagger-ui-wrapper">
        <SwaggerUI {...props} />
      </div>
    </Suspense>
  );
}