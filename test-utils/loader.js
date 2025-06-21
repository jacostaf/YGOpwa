// ES Module Loader for Node.js
// This allows us to use ES modules in our test files

import { pathToFileURL } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync } from 'fs';

const baseURL = pathToFileURL(process.cwd() + '/');

// Handle JSON imports
const jsonExtRegex = /\.json$/i;

// Handle .js files as ES modules
const jsExtRegex = /\.(mjs|js)$/i;

// Handle .jsx files as ES modules
const jsxExtRegex = /\.jsx$/i;

// Handle .ts files as ES modules
const tsExtRegex = /\.ts$/i;

// Handle .tsx files as ES modules
const tsxExtRegex = /\.tsx$/i;

// Custom loader for ES modules
export async function resolve(specifier, context, nextResolve) {
  const { parentURL = baseURL } = context;
  
  // Handle relative paths
  if (specifier.startsWith('./') || specifier.startsWith('../') || specifier.startsWith('/')) {
    const resolved = new URL(specifier, parentURL);
    
    // Try with .js extension if no extension is provided
    if (!resolved.pathname.match(/\.\w+$/)) {
      try {
        const withExt = new URL(`${resolved.href}.js`, parentURL);
        return {
          url: withExt.href,
          shortCircuit: true,
        };
      } catch (e) {
        // Continue to original resolution
      }
    }
    
    return {
      url: resolved.href,
      shortCircuit: true,
    };
  }
  
  // Defer to the next hook in the chain
  return nextResolve(specifier);
}

// Custom loader for different file types
export async function load(url, context, nextLoad) {
  if (jsonExtRegex.test(url)) {
    // Handle JSON files
    const source = readFileSync(new URL(url)).toString();
    return {
      format: 'json',
      shortCircuit: true,
      source,
    };
  }
  
  if (jsExtRegex.test(url) || jsxExtRegex.test(url) || tsExtRegex.test(url) || tsxExtRegex.test(url)) {
    // Handle JavaScript/TypeScript files
    const format = url.endsWith('.cjs') ? 'commonjs' : 'module';
    
    // Use the source from the file
    const source = readFileSync(new URL(url), 'utf8');
    
    return {
      format,
      shortCircuit: true,
      source,
    };
  }
  
  // Let Node.js handle all other URLs
  return nextLoad(url);
}

// Enable experimental modules if needed
export const getFormat = (url, context, nextGetFormat) => {
  if (jsonExtRegex.test(url)) {
    return { format: 'json' };
  }
  
  if (jsExtRegex.test(url) || jsxExtRegex.test(url) || tsExtRegex.test(url) || tsxExtRegex.test(url)) {
    return { format: 'module' };
  }
  
  return nextGetFormat(url);
};
