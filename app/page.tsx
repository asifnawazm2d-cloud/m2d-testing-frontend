"use client";

import { FileText, FileArchive, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-gray-800">
      {/* Header Section */}
      <div className="text-center pt-24 pb-16 px-4">
        <div className="mb-8">
          <img 
            src="/minus-2-degrees.png" 
            alt="M2D Logo" 
            className="h-20 mx-auto"
          />
        </div>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
          Choose your processing method
        </p>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 pb-16">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Single PDF Processing Card */}
          <Link 
            href="/pdf-processor"
            className="group bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 shadow-xl hover:bg-white/10 transition-all duration-300 hover:-translate-y-1 flex flex-col h-full"
          >
            <div className="flex-1">
              <div className="w-16 h-16 bg-blue-50 rounded-xl flex items-center justify-center mb-6">
                <FileText className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Single PDF Processing</h2>
              <p className="text-gray-300 mb-6">
                Upload and process a single PDF file. Perfect for individual documents and quick processing needs.
              </p>
            </div>
            <div className="flex items-center text-blue-600 group-hover:text-blue-700 font-medium transition-colors">
              <span className="font-medium">Get Started</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </div>
          </Link>

          {/* Bulk Processing Card */}
          <Link 
            href="/bulk-processing"
            className="group bg-white border border-gray-200 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col h-full hover:border-green-100"
          >
            <div className="flex-1">
              <div className="w-16 h-16 bg-green-50 rounded-xl flex items-center justify-center mb-6">
                <FileArchive className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-3">Bulk Processing</h2>
              <p className="text-gray-600 mb-6">
                Process multiple PDFs at once by uploading a ZIP file. Get combined results in a single CSV file.
              </p>
            </div>
            <div className="flex items-center text-green-600 group-hover:text-green-700 font-medium transition-colors">
              <span className="font-medium">Get Started</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </div>
          </Link>
        </div>

        {/* Footer */}
        <div className="mt-20 text-center text-gray-500 text-sm">
          <p>M2D Processor - Efficient PDF processing made simple</p>
        </div>
      </div>
    </div>
  );
}
