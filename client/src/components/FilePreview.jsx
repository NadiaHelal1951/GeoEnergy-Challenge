// Shows a PDF or image inside the page, without downloading it.
// The file itself is loaded by DocumentDetails and passed in as a blob URL.
export default function FilePreview({ document, url, error }) {
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
