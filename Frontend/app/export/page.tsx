export default function ExportPage() {
  const downloadCSV = () => {
    window.open("http://127.0.0.1:8000/logs/export", "_blank");
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Export Your Food Logs</h1>
      <button
        onClick={downloadCSV}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Download CSV
      </button>
    </div>
  );
}
