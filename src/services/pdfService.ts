export const extractTextFromPdf = async (pdfDataUrl: string): Promise<string> => {
  try {
    // Dynamic import to avoid top-level issues
    const pdfjsLib = await import('pdfjs-dist');
    
    // Set worker path for pdfjs using a stable CDN
    // Version 5.x uses .mjs for the worker
    const version = '5.5.207'; 
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.mjs`;

    const loadingTask = pdfjsLib.getDocument(pdfDataUrl);
    const pdf = await loadingTask.promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n\n';
    }

    return fullText;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('Falha ao extrair texto do PDF. Certifique-se de que o arquivo não está protegido.');
  }
};
