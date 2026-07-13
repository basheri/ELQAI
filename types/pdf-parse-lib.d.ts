// WHY: we import pdf-parse's internal lib entry (not the package index) to avoid
// its debug branch that reads a bundled test PDF at import time and crashes.
// @types/pdf-parse only declares the package root, so declare the lib path here.
declare module "pdf-parse/lib/pdf-parse.js" {
  interface PdfParseResult {
    text: string;
    numpages: number;
  }
  function pdfParse(dataBuffer: Buffer): Promise<PdfParseResult>;
  export default pdfParse;
}
