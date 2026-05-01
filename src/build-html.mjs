import fs from 'node:fs';
import path from 'node:path';
import posthtml from 'posthtml';
import posthtmlInclude from 'posthtml-include';

const convertToAbsolutePaths = () => {
  return function(tree) {
    tree.match({ tag: 'link' }, function(node) {
      if (node.attrs?.href?.startsWith('../')) {
        node.attrs.href = node.attrs.href.replace('../', '/');
      }
      return node;
    });
    
    tree.match({ tag: 'script' }, function(node) {
      if (node.attrs?.src?.startsWith('../')) {
        node.attrs.src = node.attrs.src.replace('../', '/');
      }
      return node;
    });
    
    tree.match({ tag: 'img' }, function(node) {
      if (node.attrs?.src?.startsWith('../')) {
        node.attrs.src = node.attrs.src.replace('../', '/');
      }
      return node;
    });
    
    tree.match({ tag: 'a' }, function(node) {
      if (node.attrs?.href?.startsWith('../')) {
        node.attrs.href = node.attrs.href.replace('../', '/');
      }
      return node;
    });
    
    return tree;
  };
};

const config = {
  plugins: [
    posthtmlInclude({
      root: './src'
    }),
    convertToAbsolutePaths()
  ]
};

const srcDir = 'src';
const distDir = 'dist';

const htmlFiles = [
  'index.html',
  'pages/catalog.html',
  'pages/about.html',
  'pages/contact.html',
  'pages/cart.html',
  'pages/product-details-template.html'
];

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function copyDirStructure(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  try {
    const items = fs.readdirSync(src);
    
    for (const item of items) {
      const srcPath = path.join(src, item);
      const destPath = path.join(dest, item);
      const stat = fs.statSync(srcPath);
      
      if (stat.isDirectory() && item !== 'scss' && item !== 'dist' && item !== 'ts') {
        copyDirStructure(srcPath, destPath);
      } else if (stat.isFile() && item !== 'index.html') {  
        fs.copyFileSync(srcPath, destPath);
      }
    }
  } catch (error) {
    console.error(`Error copying directory structure from ${src} to ${dest}:`, error.message);
    throw error;
  }
}

async function buildHTML() {
  console.log('Building HTML files with PostHTML...');
  
  try {
    ensureDir(distDir);
    
    console.log('Copying directory structure...');
    copyDirStructure(srcDir, distDir);
    
    console.log('Processing HTML files...');
    for (const file of htmlFiles) {
      const srcFile = path.join(srcDir, file);
      const distFile = path.join(distDir, file);
      
      if (fs.existsSync(srcFile)) {
        try {
          const outputDir = path.dirname(distFile);
          ensureDir(outputDir);
          
          const html = fs.readFileSync(srcFile, 'utf8');
          const result = await posthtml(config.plugins).process(html);
          
          fs.writeFileSync(distFile, result.html);
          console.log(`✓ Processed: ${path.relative(process.cwd(), srcFile)} → ${path.relative(process.cwd(), distFile)}`);
        } catch (error) {
          console.error(`✗ Error processing ${srcFile}:`, error.message);
          console.error('Stack trace:', error.stack);
        }
      } else {
        console.log(`⚠ Skipped (not found): ${srcFile}`);
      }
    }
    
    console.log('HTML build completed! Output saved to dist/ directory');
  } catch (error) {
    console.error('Fatal error during build:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

try {
  await buildHTML();
} catch (error) {
  console.error('Build failed:', error.message);
  console.error('Stack trace:', error.stack);
  process.exit(1);
}