
// beforeAll(() => {
//   global.pdfjsLib = {
//     GlobalWorkerOptions: { workerSrc: 'mock-worker-src' },
//     AbortException: jest.fn(),
//   };
// });

// // Mock pdfjsLib and related dependencies
// jest.mock('pdfjs-dist/web/pdf_viewer', () => ({
//   pdfjsLib: {
//     GlobalWorkerOptions: {
//       workerSrc: 'mock-worker-src',
//     },
//     AbortException: jest.fn(),
//   },
//   TextLayerBuilder: jest.fn(),
// }));

// jest.mock('pdfjs-dist/build/pdf', () => ({
//   getDocument: jest.fn(() => ({
//     promise: Promise.resolve({
//       numPages: 1,
//       metadata: {},
//     }),
//   })),
// }));

// // Import your functions after mocking
// import { getXPathForElement, getXPathForTextNode } from '../NewDashBoard';

// describe('XPath Utilities', () => {
//   beforeEach(() => {
//     document.body.innerHTML = `
//       <div id="test">
//         <p>First paragraph</p>
//         <p>Second paragraph</p>
//         <div>
//           <span>Nested span</span>
//         </div>
//       </div>
//     `;
//   });

//   test('getXPathForElement for top-level element', () => {
//     const element = document.querySelector('#test');
//     expect(getXPathForElement(element)).toBe('/html/body/div[1]');
//   });

//   test('getXPathForElement for nested element', () => {
//     const element = document.querySelector('span');
//     expect(getXPathForElement(element)).toBe('/html/body/div[1]/div[1]/span[1]');
//   });

//   test('getXPathForTextNode for simple text node', () => {
//     const p = document.querySelector('p');
//     const textNode = p.childNodes[0];
//     expect(getXPathForTextNode(textNode)).toBe('/html/body/div[1]/p[1]/text()[1]');
//   });
// });