import React, { useState, useEffect, useRef } from 'react';
import { Loader2, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import { useTranslation } from 'react-i18next';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set worker path for react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
  base64Url: string;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({ base64Url }) => {
  const { t } = useTranslation();
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [containerWidth, setContainerWidth] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth - 32); // 32px for padding
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  const changePage = (offset: number) => {
    setPageNumber(prevPageNumber => prevPageNumber + offset);
  };

  const previousPage = () => changePage(-1);
  const nextPage = () => changePage(1);

  const zoomIn = () => setScale(prev => Math.min(prev + 0.2, 3.0));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));

  return (
    <div className="flex flex-col h-full bg-bg-secondary/30 relative" ref={containerRef}>
      {/* Toolbar */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-bg-elevated/90 backdrop-blur-md border border-border-color shadow-lg rounded-full px-4 py-2 flex items-center gap-4 z-10">
        <div className="flex items-center gap-1">
          <button 
            onClick={zoomOut}
            className="p-1.5 text-text-secondary hover:text-jumas-green hover:bg-bg-secondary rounded-full transition-colors"
            title={t('pdf.zoomOut')}
          >
            <ZoomOut size={18} />
          </button>
          <span className="text-xs font-mono w-12 text-center text-text-primary">
            {Math.round(scale * 100)}%
          </span>
          <button 
            onClick={zoomIn}
            className="p-1.5 text-text-secondary hover:text-jumas-green hover:bg-bg-secondary rounded-full transition-colors"
            title={t('pdf.zoomIn')}
          >
            <ZoomIn size={18} />
          </button>
        </div>

        <div className="w-px h-6 bg-border-color"></div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={pageNumber <= 1}
            onClick={previousPage}
            className="p-1.5 text-text-secondary hover:text-jumas-green hover:bg-bg-secondary rounded-full transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-text-secondary"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-xs font-medium text-text-primary min-w-[60px] text-center">
            {t('pdf.pageOf', { current: pageNumber, total: numPages || '--' })}
          </span>
          <button
            type="button"
            disabled={numPages === null || pageNumber >= numPages}
            onClick={nextPage}
            className="p-1.5 text-text-secondary hover:text-jumas-green hover:bg-bg-secondary rounded-full transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-text-secondary"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* PDF Document */}
      <div className="flex-1 overflow-auto custom-scrollbar flex justify-center p-4 pb-20">
        <Document
          file={base64Url}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={
            <div className="flex flex-col items-center justify-center h-64 text-text-secondary">
              <Loader2 size={32} className="animate-spin mb-4 text-jumas-green" />
              <p className="text-sm font-medium">{t('pdf.loading')}</p>
            </div>
          }
          error={
            <div className="flex flex-col items-center justify-center h-64 text-red-500">
              <p className="text-sm font-bold">{t('pdf.errorLoad')}</p>
              <p className="text-xs mt-2 text-text-secondary">{t('pdf.errorDetails')}</p>
            </div>
          }
        >
          {containerWidth && (
            <div className="shadow-xl bg-white">
              <Page 
                pageNumber={pageNumber} 
                width={containerWidth} 
                scale={scale}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                loading={
                  <div className="flex items-center justify-center h-96">
                    <Loader2 size={24} className="animate-spin text-jumas-green" />
                  </div>
                }
              />
            </div>
          )}
        </Document>
      </div>
    </div>
  );
};
