/**
 * Receipt Scanner Component
 *
 * Camera-based receipt scanning with image capture and crop.
 * Features:
 * - Camera capture
 * - Image preview
 * - Upload and OCR processing
 * - Extracted data display
 *
 * **Validates: Requirement 44.1, 44.6**
 */

import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
} from "react-native";
import { Camera, CameraType, CameraView } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { receiptService, ProcessReceiptResponse } from "../services/receipt";

interface ReceiptScannerProps {
  visible: boolean;
  onClose: () => void;
  onScanComplete: (data: ProcessReceiptResponse) => void;
}

export const ReceiptScanner: React.FC<ReceiptScannerProps> = ({
  visible,
  onClose,
  onScanComplete,
}) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [remainingScans, setRemainingScans] = useState<number | null>(null);
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    if (visible) {
      requestPermissions();
      loadUsage();
    }
  }, [visible]);

  const requestPermissions = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === "granted");
  };

  const loadUsage = async () => {
    try {
      const usage = await receiptService.getUsage();
      setRemainingScans(usage.remaining);
    } catch (error) {
      console.error("Error loading usage:", error);
    }
  };

  const takePicture = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      if (photo?.uri) {
        setCapturedImage(photo.uri);
      }
    } catch (error) {
      console.error("Error taking picture:", error);
      Alert.alert("Error", "Failed to capture image. Please try again.");
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setCapturedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to select image. Please try again.");
    }
  };

  const processImage = async () => {
    if (!capturedImage) return;

    if (remainingScans !== null && remainingScans <= 0) {
      Alert.alert(
        "Scan Limit Reached",
        "You have reached your daily scan limit. Upgrade to Premium for more scans.",
        [{ text: "OK" }],
      );
      return;
    }

    try {
      setProcessing(true);

      const result = await receiptService.scanReceipt(capturedImage);

      setRemainingScans(result.remainingScans);
      onScanComplete(result);
      handleClose();
    } catch (error: any) {
      console.error("Error processing receipt:", error);
      Alert.alert(
        "Processing Failed",
        error.message || "Failed to process receipt. Please try again.",
        [{ text: "OK" }],
      );
    } finally {
      setProcessing(false);
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
  };

  const handleClose = () => {
    setCapturedImage(null);
    setProcessing(false);
    onClose();
  };

  if (!visible) return null;

  if (hasPermission === null) {
    return (
      <Modal visible={visible} animationType="slide">
        <View style={styles.container}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.statusText}>Requesting camera permission...</Text>
        </View>
      </Modal>
    );
  }

  if (hasPermission === false) {
    return (
      <Modal visible={visible} animationType="slide">
        <View style={styles.container}>
          <Text style={styles.errorIcon}>📷</Text>
          <Text style={styles.errorTitle}>Camera Access Required</Text>
          <Text style={styles.errorText}>
            Please enable camera access in your device settings to scan
            receipts.
          </Text>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
            <Text style={styles.headerButtonText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Scan Receipt</Text>
          <View style={styles.headerButton}>
            {remainingScans !== null && (
              <Text style={styles.scansRemaining}>{remainingScans} left</Text>
            )}
          </View>
        </View>

        {capturedImage ? (
          // Preview captured image
          <View style={styles.previewContainer}>
            <Image
              source={{ uri: capturedImage }}
              style={styles.previewImage}
            />

            {processing ? (
              <View style={styles.processingOverlay}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.processingText}>Processing receipt...</Text>
                <Text style={styles.processingSubtext}>
                  Extracting merchant, date, and total
                </Text>
              </View>
            ) : (
              <View style={styles.previewActions}>
                <TouchableOpacity
                  style={styles.retakeButton}
                  onPress={retakePhoto}
                >
                  <Text style={styles.retakeButtonText}>Retake</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.processButton}
                  onPress={processImage}
                >
                  <Text style={styles.processButtonText}>Use Photo</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          // Camera view
          <View style={styles.cameraContainer}>
            <CameraView ref={cameraRef} style={styles.camera} facing="back">
              {/* Overlay guide */}
              <View style={styles.cameraOverlay}>
                <View style={styles.guideFrame}>
                  <View style={[styles.corner, styles.topLeft]} />
                  <View style={[styles.corner, styles.topRight]} />
                  <View style={[styles.corner, styles.bottomLeft]} />
                  <View style={[styles.corner, styles.bottomRight]} />
                </View>
                <Text style={styles.guideText}>
                  Position receipt within the frame
                </Text>
              </View>
            </CameraView>

            {/* Camera controls */}
            <View style={styles.cameraControls}>
              <TouchableOpacity
                style={styles.galleryButton}
                onPress={pickImage}
              >
                <Text style={styles.galleryIcon}>🖼️</Text>
                <Text style={styles.galleryText}>Gallery</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.captureButton}
                onPress={takePicture}
              >
                <View style={styles.captureButtonInner} />
              </TouchableOpacity>

              <View style={styles.placeholderButton} />
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
    backgroundColor: "#000",
  },
  headerButton: {
    width: 80,
  },
  headerButtonText: {
    color: "#3b82f6",
    fontSize: 16,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  scansRemaining: {
    color: "#9ca3af",
    fontSize: 12,
    textAlign: "right",
  },
  statusText: {
    color: "#fff",
    fontSize: 16,
    marginTop: 16,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
  },
  errorText: {
    color: "#9ca3af",
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 32,
    marginBottom: 24,
  },
  closeButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#3b82f6",
    borderRadius: 8,
  },
  closeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  guideFrame: {
    width: "85%",
    aspectRatio: 0.7,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 24,
    height: 24,
    borderColor: "#fff",
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  guideText: {
    color: "#fff",
    fontSize: 14,
    marginTop: 16,
    textAlign: "center",
  },
  cameraControls: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 24,
    paddingBottom: 48,
    backgroundColor: "#000",
  },
  galleryButton: {
    alignItems: "center",
    width: 60,
  },
  galleryIcon: {
    fontSize: 24,
  },
  galleryText: {
    color: "#fff",
    fontSize: 12,
    marginTop: 4,
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#fff",
  },
  placeholderButton: {
    width: 60,
  },
  previewContainer: {
    flex: 1,
  },
  previewImage: {
    flex: 1,
    resizeMode: "contain",
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  processingText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
  },
  processingSubtext: {
    color: "#9ca3af",
    fontSize: 14,
    marginTop: 8,
  },
  previewActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 24,
    paddingBottom: 48,
    backgroundColor: "#000",
  },
  retakeButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    backgroundColor: "#374151",
    borderRadius: 8,
  },
  retakeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  processButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    backgroundColor: "#3b82f6",
    borderRadius: 8,
  },
  processButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default ReceiptScanner;
