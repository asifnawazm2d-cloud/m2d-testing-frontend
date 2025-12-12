
'use client';

import { useState } from 'react';
import { Upload, Download, Loader2, CheckSquare, Square, FileText } from 'lucide-react';

// Types
interface JsonResponse {
  [key: string]: any;
}
interface ColumnSelection {
  [key: string]: boolean;
}
interface ColumnMapping {
  [key: string]: string;
}
export default function PDFProcessorPage() {
  const [file, setFile] = useState<File | null>(null);
  const [methodology, setMethodology] = useState<string>('spend');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [jsonResponse, setJsonResponse] = useState<JsonResponse[] | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<ColumnSelection>({});
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [success, setSuccess] = useState(false);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        setError('Please select a valid PDF file');
        setFile(null);
        return;
      }
      if (selectedFile.size > 50 * 1024 * 1024) {
        setError('File size should be less than 50MB');
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError('');
      setJsonResponse(null);
      setSuccess(false);
    }
  };

  // Handle methodology selection
  const handleMethodologyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setMethodology(e.target.value);
  };

  // Process PDF
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setError('Please select a PDF file');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('methodology', methodology);

      const response = await fetch('http://127.0.0.1:8000/process-single-pdf', {
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

      const data = await response.json();
      
      // DEBUG: Log the raw response to understand the structure
      console.log('=== RAW API RESPONSE ===');
      console.log('Type:', typeof data);
      console.log('Data:', data);
      console.log('======================');
      
      let processedData: JsonResponse[];
      
      // Handle the specific API response structure
      if (data && data.data && data.data.result) {
        const result = data.data.result;
        const metadata = data.data._metadata;
        
        // Extract emission_calculations array
        if (result.emission_calculations && Array.isArray(result.emission_calculations)) {
          // Flatten the nested structure for CSV export
          processedData = result.emission_calculations.map((emission: any) => {
            // Flatten factor object
            const factor = emission.factor || {};
            
            return {
              // Metadata
              timestamp: metadata?.timestamp || '',
              file_path: metadata?.file_path || '',
              status_code: metadata?.status_code || '',
              elapsed_time: metadata?.elapsed_time || '',
              
              // Invoice info
              invoice_name: result.formatted_result?.invoice_name || '',
              supplier: result.formatted_result?.supplier || '',
              total_cost: result.formatted_result?.total_cost || '',
              methodology: result.methodology || '',
              
              // Emission data
              item_name: emission.name || '',
              item_description: emission.description || '',
              consumption: emission.consumption || '',
              consumption_unit: emission.consumptionUnit || '',
              usages: emission.usages || '',
              usage_unit: emission.usageUnit || '',
              scope: emission.scope || '',
              tag_name: emission.tagName || '',
              unit_conversion: emission.unitConversionFromItemToFactor || '',
              weight_confidence: emission.weightConfidence || '',
              tco2: emission.tco2 || '',
              
              // Factor details
              factor_id: factor.id || '',
              factor_name: factor.name || '',
              factor_description: factor.description || '',
              factor_co2: factor.co2 || '',
              factor_co2_unit: factor.co2_unit || '',
              factor_unit_index: factor.unit_index || '',
              factor_category_index: factor.category_index || '',
              factor_standard_index: factor.standard_index || '',
              factor_standard_name: factor.standard_name || '',
              factor_output_unit: factor.output_unit || '',
              factor_type_index: factor.factor_type_index || '',
              factor_confidence: factor.factorConfidence || '',
            };
          });
        } else {
          throw new Error('No emission calculations found in the response');
        }
      } else if (typeof data === 'string') {
        // Try to parse if it's a JSON string
        try {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed)) {
            processedData = parsed;
          } else if (typeof parsed === 'object' && parsed !== null) {
            processedData = [parsed];
          } else {
            throw new Error('Invalid data format after parsing');
          }
        } catch {
          throw new Error('Received text data instead of structured JSON. Please check API response format.');
        }
      } else if (Array.isArray(data)) {
        processedData = data;
      } else if (typeof data === 'object' && data !== null) {
        // Check if the object contains a data array or results array
        if (data.data && Array.isArray(data.data)) {
          processedData = data.data;
        } else if (data.results && Array.isArray(data.results)) {
          processedData = data.results;
        } else if (data.items && Array.isArray(data.items)) {
          processedData = data.items;
        } else {
          processedData = [data];
        }
      } else {
        throw new Error('Invalid response format from server');
      }

      setJsonResponse(processedData);

      if (processedData.length > 0) {
        const extractedColumns = Object.keys(processedData[0]);
        setColumns(extractedColumns);
        const initialSelection: ColumnSelection = {};
        const initialMapping: ColumnMapping = {};
        extractedColumns.forEach(col => {
          initialSelection[col] = true;
          initialMapping[col] = col;
        });
        setSelectedColumns(initialSelection);
        setColumnMapping(initialMapping);
      } else {
        throw new Error('No data returned from server');
      }

      setSuccess(true);
    } catch (err) {
      console.error('Error processing PDF:', err);
      setError(
        err instanceof Error 
          ? err.message 
          : 'An unexpected error occurred while processing the PDF'
      );
      setJsonResponse(null);
    } finally {
      setLoading(false);
    }
  };

  // Toggle column selection
  const toggleColumn = (column: string) => {
    setSelectedColumns(prev => ({
      ...prev,
      [column]: !prev[column]
    }));
  };

  // Select/Deselect all columns
  const toggleAllColumns = (selectAll: boolean) => {
    const newSelection: ColumnSelection = {};
    columns.forEach(col => {
      newSelection[col] = selectAll;
    });
    setSelectedColumns(newSelection);
  };

  // Update column mapping
  const updateColumnMapping = (originalColumn: string, newName: string) => {
    setColumnMapping(prev => ({
      ...prev,
      [originalColumn]: newName
    }));
  };

  // Convert JSON to CSV with proper escaping and mapping
  const jsonToCSV = (data: JsonResponse[], selectedCols: ColumnSelection, mapping: ColumnMapping): string => {
    if (data.length === 0) return '';

    const cols = columns.filter(col => selectedCols[col]);
    
    if (cols.length === 0) {
      throw new Error('Please select at least one column');
    }

    // Enhanced CSV value escaping for perfect column alignment
    const escapeCSVValue = (value: any): string => {
      // Handle null/undefined
      if (value === null || value === undefined || value === '') {
        return '""';
      }
      
      let stringValue: string;
      
      // Convert objects/arrays to JSON string
      if (typeof value === 'object') {
        stringValue = JSON.stringify(value);
      } else {
        stringValue = String(value);
      }
      
      // STEP 1: Remove ALL line breaks (critical for row integrity)
      stringValue = stringValue.replace(/[\r\n\t]+/g, ' ');
      
      // STEP 2: Normalize whitespace
      stringValue = stringValue.replace(/\s+/g, ' ').trim();
      
      // STEP 3: Escape double quotes by doubling them (CSV standard)
      stringValue = stringValue.replace(/"/g, '""');
      
      // STEP 4: Always wrap in double quotes for proper column separation
      return `"${stringValue}"`;
    };

    // Create header row with mapped column names
    const headerRow = cols.map(col => {
      const columnName = mapping[col] || col;
      return escapeCSVValue(columnName);
    }).join(',');

    // Create data rows - ensure each record is exactly ONE row
    const dataRows = data.map(record => {
      const rowValues = cols.map(col => {
        const cellValue = record[col];
        return escapeCSVValue(cellValue);
      });
      return rowValues.join(',');
    });

    // Combine header and data rows
    const csvContent = [headerRow, ...dataRows].join('\n');
    
    return csvContent;
  };

  // Download CSV
  const handleDownload = () => {
    if (!jsonResponse) {
      setError('No data available to download');
      return;
    }

    try {
      const csv = jsonToCSV(jsonResponse, selectedColumns, columnMapping);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `pdf_processed_${methodology.replace(' ', '_')}_${timestamp}.csv`;
      
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading CSV:', err);
      setError(
        err instanceof Error 
          ? err.message 
          : 'An error occurred while downloading the CSV'
      );
    }
  };

  // Reset form
  const handleReset = () => {
    setFile(null);
    setMethodology('spend');
    setJsonResponse(null);
    setColumns([]);
    setSelectedColumns({});
    setColumnMapping({});
    setError('');
    setSuccess(false);
    
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const selectedCount = Object.values(selectedColumns).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat relative" style={{
      backgroundImage: 'url("https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?q=80&w=2070")',
    }}>
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/70"></div>
      
      {/* Content */}
      <div className="relative z-10">
        {/* Header Section */}
        <div className="text-center pt-20 pb-12 px-4">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 tracking-tight">
            Digital Solution for PDF Processing
          </h1>
          <p className="text-lg md:text-xl text-gray-200 max-w-4xl mx-auto leading-relaxed mb-8">
            At Minus 2 Degrees, we are dedicated to transforming your PDF documents into actionable data.
            We achieve this by implementing advanced processing strategies throughout all our operations.
            We believe that it's not only possible but also attainable, and we are here to guide you every step of the way.
          </p>
          
          {!jsonResponse && (
            <div className="inline-block">
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-8 max-w-2xl">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* File Upload */}
                  <div>
                    <label className="block text-sm font-semibold text-white mb-3 text-left">
                      Upload PDF File
                    </label>
                    <div className="flex items-center justify-center w-full">
                      <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-white/30 border-dashed rounded-lg cursor-pointer bg-white/5 hover:bg-white/10 backdrop-blur-sm transition-all">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Upload className="w-12 h-12 mb-3 text-white/80" />
                          <p className="mb-2 text-sm text-white/90">
                            <span className="font-semibold">Click to upload</span> or drag and drop
                          </p>
                          <p className="text-xs text-white/70">PDF (MAX. 50MB)</p>
                          {file && (
                            <div className="mt-3 flex items-center gap-2 bg-green-500/20 px-4 py-2 rounded-lg">
                              <FileText className="w-4 h-4 text-green-300" />
                              <p className="text-sm text-green-200 font-medium">
                                {file.name}
                              </p>
                            </div>
                          )}
                        </div>
                        <input
                          id="file-input"
                          type="file"
                          className="hidden"
                          accept=".pdf,application/pdf"
                          onChange={handleFileChange}
                          disabled={loading}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Methodology Selection */}
                  <div>
                    <label htmlFor="methodology" className="block text-sm font-semibold text-white mb-3 text-left">
                      Select Methodology
                    </label>
                    <select
                      id="methodology"
                      value={methodology}
                      onChange={handleMethodologyChange}
                      disabled={loading}
                      className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/30 rounded-lg text-white focus:ring-2 focus:ring-white/50 focus:border-transparent disabled:bg-white/5 disabled:cursor-not-allowed"
                    >
                      <option value="spend" className="bg-gray-800">Spend</option>
                      <option value="activity" className="bg-gray-800">Activity</option>
                    </select>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="bg-red-500/20 backdrop-blur-sm border border-red-400/50 rounded-lg p-4">
                      <p className="text-sm text-red-100">{error}</p>
                    </div>
                  )}

                  {/* Buttons */}
                  <div className="flex gap-4 pt-2">
                    <button
                      type="submit"
                      disabled={loading || !file}
                      className="flex-1 bg-white text-gray-900 py-3 px-6 rounded-lg font-semibold hover:bg-gray-100 disabled:bg-white/30 disabled:text-white/50 disabled:cursor-not-allowed transition-all shadow-lg flex items-center justify-center"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                          Processing...
                        </>
                      ) : (
                        'Process PDF Now'
                      )}
                    </button>
                    
                    {file && (
                      <button
                        type="button"
                        onClick={handleReset}
                        disabled={loading}
                        className="px-6 py-3 border-2 border-white/50 rounded-lg font-semibold text-white hover:bg-white/10 disabled:bg-white/5 disabled:cursor-not-allowed transition-all"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Results Section */}
        {jsonResponse && columns.length > 0 && (
          <div className="pb-20 px-4">
            <div className="max-w-6xl mx-auto">
              <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-8">
                {/* Success Message */}
                {success && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-green-800 font-medium">
                      ✓ PDF processed successfully! Select columns, map them to custom names, and download your CSV.
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-gray-200">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      Column Mapping & Selection
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      {selectedCount} of {columns.length} columns selected
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => toggleAllColumns(true)}
                      className="text-sm bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-900 font-medium transition-colors"
                    >
                      Select All
                    </button>
                    <button
                      onClick={() => toggleAllColumns(false)}
                      className="text-sm bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 font-medium transition-colors"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                {/* Column Mapping Interface */}
                <div className="space-y-3 mb-8">
                  {columns.map((column) => (
                    <div
                      key={column}
                      className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all ${
                        selectedColumns[column]
                          ? 'border-gray-800 bg-gray-50 shadow-md'
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                      }`}
                    >
                      <div
                        onClick={() => toggleColumn(column)}
                        className="flex items-center cursor-pointer flex-shrink-0"
                      >
                        {selectedColumns[column] ? (
                          <CheckSquare className="w-5 h-5 text-gray-800" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                        <div className="flex flex-col">
                          <label className="text-xs text-gray-500 mb-1 font-medium">Original Column</label>
                          <span className="text-sm font-semibold text-gray-700 px-3 py-2 bg-gray-100 rounded border border-gray-200">
                            {column}
                          </span>
                        </div>
                        
                        <div className="flex flex-col">
                          <label htmlFor={`mapping-${column}`} className="text-xs text-gray-500 mb-1 font-medium">
                            Map to CSV Column Name
                          </label>
                          <input
                            id={`mapping-${column}`}
                            type="text"
                            value={columnMapping[column] || column}
                            onChange={(e) => updateColumnMapping(column, e.target.value)}
                            disabled={!selectedColumns[column]}
                            placeholder="Enter custom column name"
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-gray-800 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Download Section */}
                <div className="flex gap-4">
                  <button
                    onClick={handleDownload}
                    disabled={selectedCount === 0}
                    className="flex-1 bg-gray-900 text-white py-4 px-6 rounded-lg font-semibold hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all shadow-lg flex items-center justify-center text-lg"
                  >
                    <Download className="w-6 h-6 mr-2" />
                    Download CSV ({selectedCount} columns)
                  </button>
                  
                  <button
                    onClick={handleReset}
                    className="px-6 py-4 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-all"
                  >
                    Process Another PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
