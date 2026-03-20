declare module "jspdf/dist/jspdf.es.min.js" {
  export const jsPDF: new (
    orientation?: string,
    unit?: string,
    format?: string
  ) => {
    internal: {
      pageSize: {
        getWidth(): number;
        getHeight(): number;
      };
    };
    addPage(): void;
    addImage(
      imageData: string,
      format: string,
      x: number,
      y: number,
      width: number,
      height: number,
      alias?: string,
      compression?: string
    ): void;
    save(filename: string): void;
  };

  const defaultExport: {
    jsPDF: typeof jsPDF;
  };

  export default defaultExport;
}