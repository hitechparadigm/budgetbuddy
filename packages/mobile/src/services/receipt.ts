/**
 * Receipt Service for Mobile
 * Handles receipt upload, OCR processing, and transaction creation
 *
 * **Validates: Requirement 44**
 */

import { api } from './api';

// Types
export interface ReceiptUploadResponse {
  receiptId: string;
  uploadUrl: string;
  s3Key: string;
  expiresIn: number;
  remainingScans: number;
}

export interface ExtractedReceiptData {
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
  paymentMethod: string | null;
  confidence: number;
  rawText: string;
  suggestedCategory: string;
}

export interface ProcessReceiptResponse {
  receiptId: string;
  extractedData: ExtractedReceiptData;
  remainingScans: number;
}

export interface ReceiptUsageResponse {
  dailyUsed: number;
  dailyLimit: number;
  remaining: number;
  isPremium: boolean;
  resetsAt: string;
}

export interface Receipt {
  receiptId: string;
  status: 'pending_upload' | 'processed' | 'failed';
  extractedData?: ExtractedReceiptData;
  confidence?: number;
  linkedTransactionId?: string;
  processedAt?: string;
  createdAt: string;
}

// Receipt API
export const receiptService = {
  // Get presigned URL for upload
  async getUploadUrl(
    contentType: string = 'image/jpeg',
    fileName?: string
  ): Promise<ReceiptUploadResponse> {
    const response = await api.post('/receipt/upload', {
      contentType,
      fileName,
    });
    return response.data.data;
  },

  // Upload image to S3
  async uploadImage(uploadUrl: string, imageUri: string, contentType: string): Promise<void> {
    const response = await fetch(imageUri);
    const blob = await response.blob();

    await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
      },
      body: blob,
    });
  },

  // Process uploaded receipt with OCR
  async processReceipt(receiptId: string): Promise<ProcessReceiptResponse> {
    const response = await api.post('/receipt/process', { receiptId });
    return response.data.data;
  },

  // Get usage statistics
  async getUsage(): Promise<ReceiptUsageResponse> {
    const response = await api.get('/receipt/usage');
    return response.data.data;
  },

  // Get receipt by ID
  async getReceipt(receiptId: string): Promise<Receipt> {
    const response = await api.get(`/receipt/${receiptId}`);
    return response.data.data;
  },

  // Get receipt history
  async getHistory(limit: number = 20): Promise<{ receipts: Receipt[]; count: number }> {
    const response = await api.get('/receipt/history', { limit });
    return response.data.data;
  },

  // Full scan workflow: upload + process
  async scanReceipt(
    imageUri: string,
    contentType: string = 'image/jpeg'
  ): Promise<ProcessReceiptResponse> {
    // Step 1: Get upload URL
    const uploadData = await this.getUploadUrl(contentType);

    // Step 2: Upload image
    await this.uploadImage(uploadData.uploadUrl, imageUri, contentType);

    // Step 3: Process with OCR
    const result = await this.processReceipt(uploadData.receiptId);

    return result;
  },
};

export default receiptService;
