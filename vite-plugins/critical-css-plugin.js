/**
 * Critical CSS Vite Plugin
 * 
 * Custom Vite plugin for critical CSS optimization:
 * - Extracts critical CSS for inline inclusion
 * - Generates async loading patterns for non-critical CSS
 * - Optimizes HTML templates for fastest render
 * - Handles theme-specific CSS loading
 */

import fs from 'fs';
import path from 'path';

/**
 * Critical CSS Vite Plugin
 */
export function criticalCSSPlugin(options = {}) {
  const {
    criticalCSSPath = 'src/css/critical.css',
    nonCriticalFiles = [
      'src/css/main.css',
      'src/css/components.css', 
      'src/css/responsive.css',
      'src/css/space-theme-bridge.css'
    ],
    minify = true
  } = options;

  let criticalCSS = '';
  let isProduction = false;

  return {
    name: 'critical-css',
    enforce: 'post',
    
    configResolved(config) {
      isProduction = config.command === 'build';
    },

    buildStart() {
      // Load critical CSS
      try {
        const fullPath = path.resolve(criticalCSSPath);
        criticalCSS = fs.readFileSync(fullPath, 'utf8');
        
        if (minify && isProduction) {
          // Basic CSS minification
          criticalCSS = criticalCSS
            .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
            .replace(/\s+/g, ' ') // Collapse whitespace
            .replace(/;\s*}/g, '}') // Remove last semicolon before closing brace
            .replace(/{\s*/g, '{') // Remove space after opening brace
            .replace(/;\s*/g, ';') // Remove space after semicolon
            .trim();
        }
        
        console.log(`✅ Critical CSS loaded: ${(criticalCSS.length / 1024).toFixed(2)}KB`);
      } catch (error) {
        console.warn('⚠️ Warning: Could not load critical CSS:', error.message);
        criticalCSS = '';
      }
    },

    generateBundle(options, bundle) {
      // Find HTML files in the bundle
      Object.keys(bundle).forEach(fileName => {
        const file = bundle[fileName];
        
        if (fileName.endsWith('.html') && file.type === 'asset') {
          console.log(`🎯 Optimizing CSS loading for ${fileName}...`);
          
          let html = file.source;
          
          // Find all CSS assets in the bundle (excluding space-layout.css)
          const cssAssets = Object.keys(bundle)
            .filter(name => name.endsWith('.css') && !name.includes('space-layout'))
            .filter(name => bundle[name].type === 'asset');
          
          console.log(`Found CSS assets: ${cssAssets.join(', ')}`);
          
          // Remove original CSS link tags for non-critical files
          nonCriticalFiles.forEach(cssFile => {
            const patterns = [
              new RegExp(`\\s*<link[^>]*href="${cssFile}"[^>]*>`, 'g'),
              new RegExp(`\\s*<link[^>]*href="\\./assets/[^"]*"[^>]*rel="stylesheet"[^>]*>`, 'g')
            ];
            patterns.forEach(pattern => {
              html = html.replace(pattern, '');
            });
          });
          
          // Remove bundled CSS link tags
          cssAssets.forEach(cssAsset => {
            const linkRegex = new RegExp(`\\s*<link[^>]*href="\\./assets/${cssAsset}"[^>]*>`, 'g');
            html = html.replace(linkRegex, '');
          });
          
          // Generate async CSS loading for bundled CSS files
          const asyncCSSLinks = cssAssets.map(cssFile => `
    <link rel="preload" href="./${cssFile}" as="style" onload="this.onload=null;this.rel='stylesheet'">
    <noscript><link rel="stylesheet" href="./${cssFile}"></noscript>`).join('');
          
          // Prepare critical CSS section
          const criticalCSSSection = `
    <!-- Critical CSS - Inlined for fastest render -->
    <style id="critical-css">${criticalCSS}</style>
    
    <!-- Non-critical CSS - Loaded asynchronously -->
${asyncCSSLinks}
    
    <!-- CSS preload polyfill for older browsers -->
    <script>
      !function(t){"use strict";t.loadCSS||(t.loadCSS=function(){});var e=loadCSS.relpreload={};if(e.support=function(){var e;try{e=t.document.createElement("link").relList.supports("preload")}catch(t){e=!1}return function(){return e}}(),e.bindMediaToggle=function(t){var e=t.media||"all";function a(){t.addEventListener?t.removeEventListener("load",a):t.attachEvent&&t.detachEvent("onload",a),t.setAttribute("onload",null),t.media=e}t.addEventListener?t.addEventListener("load",a):t.attachEvent&&t.attachEvent("onload",a),setTimeout(function(){t.rel="stylesheet",t.media="only x"}),setTimeout(a,3e3)},!e.support()){var a=t.document.getElementsByTagName("link");for(var n=0;n<a.length;n++){var o=a[n];"preload"!==o.getAttribute("rel")||"style"!==o.getAttribute("as")||o.getAttribute("data-loadcss")||(o.setAttribute("data-loadcss",!0),e.bindMediaToggle(o))}}}(this);
    </script>`;
          
          // Find the location to insert critical CSS (after icons, before preload)
          const insertPosition = html.indexOf('<!-- Preload critical resources -->');
          if (insertPosition !== -1) {
            html = html.substring(0, insertPosition) + criticalCSSSection + '\n    ' + html.substring(insertPosition);
          } else {
            // Fallback: insert before closing head tag
            html = html.replace('</head>', criticalCSSSection + '\n</head>');
          }
          
          // Update the bundle
          file.source = html;
          
          console.log(`✅ CSS loading optimized for ${fileName} with ${cssAssets.length} CSS files`);
        }
      });
    }
  };
}

/**
 * Theme-specific CSS optimization plugin
 */
export function themeOptimizationPlugin() {
  return {
    name: 'theme-optimization',
    enforce: 'post',
    
    generateBundle(options, bundle) {
      // Find HTML files and optimize theme loading
      Object.keys(bundle).forEach(fileName => {
        const file = bundle[fileName];
        
        if (fileName.endsWith('.html') && file.type === 'asset') {
          let html = file.source;
          
          // Optimize space theme loading - make it truly lazy
          html = html.replace(
            /<link rel="stylesheet" href="[^"]*space-layout\.css"[^>]*>/g,
            ''
          );
          
          // Add space theme lazy loading script
          const spaceThemeScript = `
    <script>
      // Lazy load space theme CSS when needed
      function loadSpaceTheme() {
        if (!document.getElementById('space-layout-css')) {
          const link = document.createElement('link');
          link.id = 'space-layout-css';
          link.rel = 'stylesheet';
          link.href = './assets/space-layout.css';
          link.disabled = true;
          document.head.appendChild(link);
        }
      }
      
      // Listen for theme change events
      window.addEventListener('themeChanged', (event) => {
        if (event.detail && event.detail.to === 'space') {
          loadSpaceTheme();
        }
      });
    </script>`;
          
          html = html.replace('</body>', spaceThemeScript + '\n</body>');
          file.source = html;
        }
      });
    }
  };
}