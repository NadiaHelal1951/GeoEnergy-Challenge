// Shows a PDF or image inside the page, without downloading it.
import { useEffect, useState } from 'react';
import { fetchDocumentFileUrl } from '../api';

export default function FilePreview({ document }) {
  const [url, setUrl] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let fileUrl = null;
    let cancelled = false; // stops us updating state if the dialog was closed while loading

    fetchDocumentFileUrl(document.id)
      .then((u) => {
        fileUrl = u;
        if (!cancelled) setUrl(u);
      })
      .catch((err) => !cancelled && setError(err.message));

    // Clean-up when the preview closes: free the memory used by the file.
    return () => {
      cancelled = true;
      if (fileUrl) URL.revokeObjectURL(fileUrl);
    };
  }, [document.id]);

  if (error) return <p className="error">{error}</p>;
  if (!url) return <div className="preview loading muted">Loading preview…</div>;

  if (document.mime_type === 'application/pdf') {
    // The browser's built-in PDF viewer shows the file inside the iframe.
    return <iframe className="preview" src={url} title={`Preview of ${document.title}`} />;
  }

  return (
    <div className="preview image">
      <img src={url} alt={`Preview of ${document.title}`} />
    </div>
  );
}
