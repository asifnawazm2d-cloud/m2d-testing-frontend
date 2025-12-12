'use client';

import { useState, useCallback } from 'react';
import { Upload, Download, Loader2, CheckSquare, Square, FileArchive } from 'lucide-react';

interface BulkProcessingResponse {
  status: string;
  message: string;
  data?: {
    results: any[];
    processed_files: number;
    failed_files: number;
    total_emissions?: number;
  };
  _metadata?: {
    timestamp: string;
    elapsed_time: number;
  };
}
export default function BulkProcessingPage() {
  const [file, setFile] = useState<File | null>(null);
  const [methodology, setMethodology] = useState<string>('spend');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string>('');
  const [processingStats, setProcessingStats] = useState<{
    processed: number;
    total: number;
    failed: number;
  } | null>(null);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/zip' && !selectedFile.name.endsWith('.zip')) {
        setError('Please select a valid ZIP file');
        setFile(null);
        return;
      }
      if (selectedFile.size > 100 * 1024 * 1024) { // 100MB limit
        setError('File size should be less than 100MB');
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError('');
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setError('Please select a ZIP file');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);
    setDownloadUrl('');
    setProcessingStats(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('methodology', methodology);

    try {
      const response = await fetch('http://127.0.0.1:8000/bulk_processing', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.detail || 
          errorData.message || 
          `Server error: ${response.status} ${response.statusText}`
        );
      }

      // Get the response as blob for download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      setDownloadUrl(url);
      
      // Try to extract processing stats from response headers or content disposition
      const contentDisposition = response.headers.get('content-disposition');
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1].replace(/"/g, '')
        : `bulk_processing_${new Date().toISOString().split('T')[0]}.csv`;
      
      setProcessingStats({
        processed: parseInt(response.headers.get('x-processed-count') || '0'),
        failed: parseInt(response.headers.get('failed-count') || '0'),
        total: parseInt(response.headers.get('total-files') || '0'),
      });

      // Auto-download the file
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setSuccess(true);
    } catch (err) {
      console.error('Error processing bulk files:', err);
      setError(
        err instanceof Error 
          ? err.message 
          : 'An unexpected error occurred while processing the files'
      );
    } finally {
      setLoading(false);
    }
  };

  // Reset form
  const handleReset = () => {
    setFile(null);
    setMethodology('spend');
    setError('');
    setSuccess(false);
    setDownloadUrl('');
    setProcessingStats(null);
    
    const fileInput = document.getElementById('zip-file-input') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-gray-100">
      {/* Header Section */}
      <div className="text-center pt-20 pb-12 px-4">
        <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 tracking-tight">
          Bulk PDF Processing
        </h1>
        <p className="text-lg md:text-xl text-gray-200 max-w-4xl mx-auto leading-relaxed mb-8">
          Process multiple PDFs at once by uploading a ZIP file. Get combined results in a single CSV file.
        </p>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 pb-16">
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
          {/* Form Section */}
          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* File Upload */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Upload ZIP File
                </label>
                <div className="flex items-center justify-center w-full">
                  <label
                    htmlFor="zip-file-input"
                    className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                      file
                        ? 'border-green-500 bg-green-500/10'
                        : 'border-gray-600 hover:border-gray-500 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <FileArchive className="w-12 h-12 mb-3 text-gray-400" />
                      {file ? (
                        <>
                          <p className="mb-2 text-sm text-gray-300">
                            <span className="font-semibold">{file.name}</span>
                          </p>
                          <p className="text-xs text-gray-400">
                            {formatFileSize(file.size)}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="mb-2 text-sm text-gray-400">
                            <span className="font-semibold">Click to upload</span> or drag and drop
                          </p>
                          <p className="text-xs text-gray-500">
                            ZIP file (MAX. 100MB)
                          </p>
                        </>
                      )}
                    </div>
                    <input 
                      id="zip-file-input" 
                      type="file" 
                      className="hidden" 
                      accept=".zip,application/zip"
                      onChange={handleFileChange}
                    />
                  </label>
                </div>
              </div>

              {/* Methodology Selection */}
              <div className="space-y-2">
                <label htmlFor="methodology" className="block text-sm font-medium text-gray-300">
                  Methodology
                </label>
                <select
                  id="methodology"
                  value={methodology}
                  onChange={(e) => setMethodology(e.target.value)}
                  disabled={loading}
                  className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/30 rounded-lg text-white focus:ring-2 focus:ring-white/50 focus:border-transparent disabled:bg-white/5 disabled:cursor-not-allowed"
                >
                  <option value="spend" className="bg-gray-800">Spend Based</option>
                  <option value="activity" className="bg-gray-800">Activity Based</option>
                </select>
              </div>

              {/* Status and Actions */}
              <div className="pt-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-red-800 font-medium">
                      {error}
                    </p>
                  </div>
                )}

                {success && processingStats && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-green-800 font-medium mb-2">
                      ✓ Successfully processed {processingStats.processed} out of {processingStats.total} files.
                      {processingStats.failed > 0 && (
                        <span className="text-yellow-800"> {processingStats.failed} files failed to process.</span>
                      )}
                    </p>
                    {downloadUrl && (
                      <a
                        href={downloadUrl}
                        download={`bulk_processing_${new Date().toISOString().split('T')[0]}.csv`}
                        className="inline-flex items-center text-sm font-medium text-green-700 hover:text-green-900"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download Results
                      </a>
                    )}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="submit"
                    disabled={!file || loading}
                    className={`flex-1 flex items-center justify-center px-6 py-3 rounded-lg font-medium transition-colors ${
                      !file || loading
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800'
                    }`}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="animate-spin mr-2 h-5 w-5" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5 mr-2" />
                        Process Files
                      </>
                    )}
                  </button>
                  
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-6 py-3 bg-white/5 border border-white/20 rounded-lg font-medium text-white hover:bg-white/10 transition-colors"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-12 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-white mb-4">How to use</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-200 mb-2">Preparing your ZIP file</h3>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">•</span>
                  <span>Create a ZIP file containing your PDFs (max 100MB)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">•</span>
                  <span>Ensure all PDFs are valid and not password protected</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">•</span>
                  <span>For best results, name your files meaningfully</span>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-200 mb-2">Processing</h3>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">•</span>
                  <span>Select your methodology (Spend or Activity based)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">•</span>
                  <span>Click "Process Files" to start the analysis</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">•</span>
                  <span>Download the results when processing is complete</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
