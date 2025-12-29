declare module 'graphql-depth-limit' {
  import { ValidationRule } from 'graphql';

  interface DepthLimitOptions {
    ignore?: string[] | ((fieldName: string) => boolean);
  }

  function depthLimit(
    maxDepth: number,
    options?: DepthLimitOptions,
    callback?: (depths: Record<string, number>) => void
  ): ValidationRule;

  export default depthLimit;
}

