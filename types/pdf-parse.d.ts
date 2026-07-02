declare module "pdf-parse/lib/pdf-parse.js" {
  interface PDFParseResult {
    numpages: number;
    numrender: number;
    info: any;
    metadata: any;
    text: string;
    version: string;
  }
  function pdf(dataBuffer: Buffer, options?: any): Promise<PDFParseResult>;
  export default pdf;
}
