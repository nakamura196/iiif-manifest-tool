declare module 'swagger-ui-react' {
  import { ComponentType } from 'react';

  interface SwaggerUIProps {
    spec?: object;
    url?: string;
    requestInterceptor?: (req: { url: string; headers: Record<string, string> }) => { url: string; headers: Record<string, string> };
    withCredentials?: boolean;
    persistAuthorization?: boolean;
    docExpansion?: string;
    defaultModelsExpandDepth?: number;
    displayRequestDuration?: boolean;
    filter?: boolean;
    showExtensions?: boolean;
    showCommonExtensions?: boolean;
    tryItOutEnabled?: boolean;
    // Allow additional properties with specific types
    onComplete?: () => void;
    deepLinking?: boolean;
  }

  const SwaggerUI: ComponentType<SwaggerUIProps>;
  export default SwaggerUI;
}