// module.exports = {
//   testEnvironment: 'jsdom',
//   transform: {
//     '^.+\\.(js|jsx)$': 'babel-jest',
//     '^.+\\.mjs$': 'babel-jest' // Add this line for .mjs files
//   },
//   transformIgnorePatterns: [
//     'node_modules/(?!(pdfjs-dist)/)' // Explicitly transform pdfjs-dist
//   ],
//   moduleNameMapper: {
//     '\\.(css|less)$': 'identity-obj-proxy'
//   }
// };

//NEARKY WORKED BUT ISSUES WITH CSS BUT NO MORE PDF ISSUES
// module.exports = {
//   transform: {
//     "^.+\\.[t|j]sx?$": "babel-jest",
//   },
//   transformIgnorePatterns: [
//     "/node_modules/(?!pdfjs-dist)/",
//   ],
//   moduleNameMapper: {
//     '\\.css$': 'identity-obj-proxy', // If you're dealing with CSS imports
//   },
// };

//nearly but now error with uselocation and usenavigate
// module.exports = {
//   testEnvironment: 'jsdom',
//   transform: {
//     '^.+\\.(js|jsx)$': 'babel-jest',
//     '^.+\\.mjs$': 'babel-jest'
//   },
//   moduleNameMapper: {
//     '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
//     '^@/(.*)$': '<rootDir>/src/$1', // Optional path alias
//     '^.+.(css|styl|less|sass|scss|png|jpg|ttf|woff|woff2)$': 'jest-transform-stub',
//   },
//   transformIgnorePatterns: [
//     'node_modules/(?!(pdfjs-dist|tesseract.js)/)'
//   ]
// };

//CLOSE BUT ISSUE NOW WITH UUID
// module.exports = {
//   testEnvironment: 'jest-environment-jsdom',
//   testEnvironmentOptions: {
//   customExportConditions: [''],
//   html: '<!DOCTYPE html>',
//   url: 'http://localhost',
//   userAgent: 'Jest',
//   pretendToBeVisual: true
//   },
//   transform: {
//     '^.+\\.(js|jsx)$': 'babel-jest',
//     '^.+\\.mjs$': 'babel-jest'
//   },
//   moduleNameMapper: {
//     '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
//     '^@/(.*)$': '<rootDir>/src/$1', // Optional path alias
//     '^.+.(css|styl|less|sass|scss|png|jpg|ttf|woff|woff2)$': 'jest-transform-stub',
//   },
//   transformIgnorePatterns: [
//     'node_modules/(?!(pdfjs-dist|tesseract.js)/)'
//   ]
// };

//UUID WORKS BUT TEXT LEYR DONT
// module.exports = {
//   testEnvironment: 'jest-environment-jsdom',
//   transform: {
//     '^.+\\.(js|jsx)$': 'babel-jest',
//     '^.+\\.mjs$': 'babel-jest'
//   },
//   moduleNameMapper: {
//     '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
//     '^@/(.*)$': '<rootDir>/src/$1', // Optional path alias
//     '^.+.(css|styl|less|sass|scss|png|jpg|ttf|woff|woff2)$': 'jest-transform-stub',
//     '^uuid$': 'uuid', // Force CommonJS version
//   },
//   transformIgnorePatterns: [
//     'node_modules/(?!(pdfjs-dist|tesseract.js)/)'
//   ],
//   globals: {
//     TextEncoder: require('util').TextEncoder,
//     TextDecoder: require('util').TextDecoder
//   }
// };

// module.exports = {
//   testEnvironment: 'jest-environment-jsdom',
//   transform: {
//     '^.+\\.(js|jsx)$': 'babel-jest',
//     '^.+\\.mjs$': 'babel-jest'
//   },
//   moduleNameMapper: {
//     '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
//     '^@/(.*)$': '<rootDir>/src/$1', // Optional path alias
//     '^.+.(css|styl|less|sass|scss|png|jpg|ttf|woff|woff2)$': 'jest-transform-stub',
//     '^uuid$': 'uuid', // Force CommonJS version
//     '^pdfjs-dist$': 'pdfjs-dist/build/pdf',
//     '^pdfjs-dist/web/pdf_viewer$': 'pdfjs-dist/web/pdf_viewer'
//   },
//   transformIgnorePatterns: [
//     'node_modules/(?!(pdfjs-dist|tesseract.js)/)'
//   ],
//   globals: {
//     TextEncoder: require('util').TextEncoder,
//     TextDecoder: require('util').TextDecoder
//   }
// };
