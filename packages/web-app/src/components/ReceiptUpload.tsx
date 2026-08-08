/**
 * Receipt Upload Component
 *
 * File picker-based receipt upload for web.
 * Features:
 * - Drag and drop file upload
 * - File picker
 * - Upload progress
 * - OCR processing
 * - Extracted data display
 *
 * **Validates: Requirement 44**
 */

import React, { useState, useRef, useCallback } from "react";

// Types
interface ExtractedReceiptData {
  merchant: string | null;
  date: string | null;
  total: number | null;
  subtotal: number | null;
  tax: number | null;
  items: Array<{
    name: string | null;
    quantity: number | null;
    price: number | null;
  }>;
  confidence: number;
  suggestedCategory: string;
}

interface ReceiptUploadProps {
  onScanComplete: (data: {
    receiptId: string;
    extractedData: ExtractedReceiptData;
  }) => void;
  onClose?: () => void;
}

// API configuration — receipt endpoints live on the Extended Features API
import { config } from '../config/environment';
const API_BASE = config.extendedFeaturesApiUrl;

const getToken = (): string | null => {
  return localStorage.getItem("budgetbuddy_id_token");
};

export const ReceiptUpload: React.FC<ReceiptUploadProps> = ({
  onScanComplete,
  onClose,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remainingScans, setRemainingScans] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    // Validate file type
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/heic",
      "application/pdf",
    ];
    if (!allowedTypes.includes(file.type)) {
      setError("Invalid file type. Please upload an image or PDF.");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError("File too large. Maximum size is 10MB.");
      return;
    }

    setSelectedFile(file);
    setError(null);

    // Create preview URL for images
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      setError(null);

      const token = getToken();
      if (!token) {
        throw new Error("Please log in to scan receipts");
      }

      // Step 1: Get presigned upload URL
      let uploadResponse;
      try {
        uploadResponse = await fetch(`${API_BASE}/receipt/upload`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            contentType: selectedFile.type,
            fileName: selectedFile.name,
          }),
        });
      } catch (fetchError) {
        if (
          fetchError instanceof TypeError &&
          fetchError.message === "Failed to fetch"
        ) {
          throw new Error(
            "Network error: Unable to connect to the server. Please check your internet connection and try again.",
          );
        }
        throw fetchError;
      }

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.message || "Failed to get upload URL");
      }

      const uploadData = await uploadResponse.json();
      const { receiptId, uploadUrl } = uploadData.data;
      setRemainingScans(uploadData.data.remainingScans);

      // Step 2: Upload file to S3
      setUploading(false);
      setProcessing(true);

      try {
        await fetch(uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": selectedFile.type,
          },
          body: selectedFile,
        });
      } catch (fetchError) {
        if (
          fetchError instanceof TypeError &&
          fetchError.message === "Failed to fetch"
        ) {
          throw new Error(
            "Network error: Unable to upload the receipt. Please check your internet connection and try again.",
          );
        }
        throw fetchError;
      }

      // Step 3: Process with OCR
      let processResponse;
      try {
        processResponse = await fetch(`${API_BASE}/receipt/process`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ receiptId }),
        });
      } catch (fetchError) {
        if (
          fetchError instanceof TypeError &&
          fetchError.message === "Failed to fetch"
        ) {
          throw new Error(
            "Network error: Unable to process the receipt. Please check your internet connection and try again.",
          );
        }
        throw fetchError;
      }

      if (!processResponse.ok) {
        const errorData = await processResponse.json();
        throw new Error(errorData.message || "Failed to process receipt");
      }

      const processData = await processResponse.json();
      setRemainingScans(processData.data.remainingScans);

      // Success - call callback
      onScanComplete({
        receiptId,
        extractedData: processData.data.extractedData,
      });

      // Reset state
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (err: unknown) {
      if (err instanceof TypeError && err.message === "Failed to fetch") {
        setError(
          "Network error: Unable to connect to the server. Please check your internet connection and try again.",
        );
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setUploading(false);
      setProcessing(false);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="bg-[var(--color-surface)] rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📷</span>
          <h2 className="text-lg font-semibold text-[var(--color-foreground)]">Scan Receipt</h2>
        </div>
        {remainingScans !== null && (
          <span className="text-sm text-[var(--color-muted-foreground)]">
            {remainingScans} scans remaining today
          </span>
        )}
      </div>

      {/* Drop zone */}
      {!selectedFile && (
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging
              ? "border-blue-500 bg-blue-50"
              : "border-[var(--color-border)] hover:border-gray-400"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="text-4xl mb-4">📄</div>
          <p className="text-[var(--color-muted-foreground)] mb-2">
            Drag and drop your receipt here, or
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)]"
          >
            Browse Files
          </button>
          <p className="text-sm text-[var(--color-muted-foreground)] mt-4">
            Supports JPEG, PNG, WebP, HEIC, and PDF (max 10MB)
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
            onChange={handleFileInputChange}
            className="hidden"
          />
        </div>
      )}

      {/* File preview */}
      {selectedFile && (
        <div className="space-y-4">
          <div className="flex items-start gap-4 p-4 bg-[var(--color-background)] rounded-lg">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Receipt preview"
                className="w-24 h-32 object-cover rounded"
              />
            ) : (
              <div className="w-24 h-32 bg-gray-200 rounded flex items-center justify-center">
                <span className="text-3xl">📄</span>
              </div>
            )}
            <div className="flex-1">
              <p className="font-medium text-[var(--color-foreground)]">{selectedFile.name}</p>
              <p className="text-sm text-[var(--color-muted-foreground)]">
                {formatFileSize(selectedFile.size)}
              </p>
              <p className="text-sm text-[var(--color-muted-foreground)]">{selectedFile.type}</p>
            </div>
            <button
              onClick={handleClear}
              className="text-[var(--color-muted-foreground)] hover:text-[var(--color-muted-foreground)]"
              disabled={uploading || processing}
            >
              ✕
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleClear}
              className="flex-1 px-4 py-2 border border-[var(--color-border)] text-[var(--color-foreground)] rounded-lg hover:bg-[var(--color-background)]"
              disabled={uploading || processing}
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              disabled={uploading || processing}
            >
              {uploading
                ? "Uploading..."
                : processing
                  ? "Processing..."
                  : "Scan Receipt"}
            </button>
          </div>
        </div>
      )}

      {/* Processing indicator */}
      {(uploading || processing) && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <div>
              <p className="font-medium text-blue-900">
                {uploading ? "Uploading receipt..." : "Processing with AI..."}
              </p>
              <p className="text-sm text-blue-700">
                {uploading
                  ? "Uploading your image to secure storage"
                  : "Extracting merchant, date, and total"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-red-500">⚠️</span>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Close button */}
      {onClose && (
        <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
};

export default ReceiptUpload;
