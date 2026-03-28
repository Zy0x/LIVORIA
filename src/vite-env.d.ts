/// <reference types="vite/client" />

declare module 'gsap' {
  const gsap: any;
  export default gsap;
  export const ScrollTrigger: any;
}

declare module 'gsap/ScrollTrigger' {
  const ScrollTrigger: any;
  export { ScrollTrigger };
  export default ScrollTrigger;
}

declare module 'vite-plugin-pwa' {
  export function VitePWA(options?: any): any;
}

declare module 'jspdf' {
  class jsPDF {
    constructor(options?: any);
    text(text: string, x: number, y: number, options?: any): jsPDF;
    setFontSize(size: number): jsPDF;
    setFont(fontName: string, fontStyle?: string): jsPDF;
    addPage(): jsPDF;
    save(filename: string): jsPDF;
    internal: any;
    autoTable(options: any): jsPDF;
    lastAutoTable: any;
  }
  export default jsPDF;
}

declare module 'jspdf-autotable' {}
