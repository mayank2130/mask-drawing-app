import React, { useState, useRef } from "react";
import CanvasDraw from "react-canvas-draw";
import { Download, Trash2, Brush, Minus, Plus, Loader2 } from "lucide-react";
import { BACKEND_URL, dataUrlToFile, uploadImageToS3 } from "../lib/upload";


const MaskDrawingApp: React.FC = () => {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [maskImage, setMaskImage] = useState<string | null>(null);
  const [brushRadius, setBrushRadius] = useState<number>(10);
  const [uploading, setUploading] = useState<boolean>(false);

  const canvasRef = useRef<CanvasDraw | null>(null);

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        setUploading(true);
        const uploadedImageUrl = await uploadImageToS3(
          true,
          file,
          `${BACKEND_URL}/presignedUrl`
        );
        // console.log("Uploaded Image URL:", uploadedImageUrl);
        setOriginalImage(uploadedImageUrl);
      } catch (error) {
        console.error("Image upload error:", error);
      } finally {
        setUploading(false);
      }
    }
  };

  const generateMask = async () => {
    if (!canvasRef.current || !originalImage) return;

    try {
      setUploading(true);
      //@ts-ignore
      const canvas = canvasRef.current.canvas.drawing;
      const ctx = canvas.getContext("2d");

      if (!ctx) return;

      const maskCanvas = document.createElement("canvas");
      maskCanvas.width = canvas.width;
      maskCanvas.height = canvas.height;
      const maskCtx = maskCanvas.getContext("2d");

      if (!maskCtx) return;

      const img = new Image();
      img.src = originalImage;

      // Use Promise to ensure image is fully loaded and mask is created
      const maskDataUrl = await new Promise<string>((resolve, reject) => {
        img.onload = () => {
          maskCtx.fillStyle = "black";
          maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);

          maskCtx.globalCompositeOperation = "source-over";
          maskCtx.drawImage(canvas, 0, 0);

          const dataUrl = maskCanvas.toDataURL("image/png");
          resolve(dataUrl);
        };
        img.onerror = reject;
      });

      setMaskImage(maskDataUrl);
      const maskImageFile = await dataUrlToFile(maskDataUrl, "mask.png");

      const maskImageUrl = await uploadImageToS3(
        false,
        maskImageFile,
        `${BACKEND_URL}/presignedUrl`
      );

      // console.log("Mask uploaded successfully:", maskImageUrl);
    } catch (error) {
      console.error("Error processing and uploading mask:", error);
    } finally {
      setUploading(false);
    }
  };

  const clearCanvas = () => {
    if (canvasRef.current) {
      canvasRef.current.clear();
      setMaskImage(null);
    }
  };

  const increaseBrushSize = () =>
    setBrushRadius((prev) => Math.min(prev + 5, 50));

  const decreaseBrushSize = () =>
    setBrushRadius((prev) => Math.max(prev - 5, 5));

  const downloadMask = () => {
    if (maskImage) {
      const link = document.createElement("a");
      link.href = maskImage;
      link.download = "mask.png";
      link.click();
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Image Mask Drawing Tool</h1>
      <div className="mb-4">
        <div className="flex items-center space-x-2">
          <input
            type="file"
            accept="image/jpeg,image/png"
            onChange={handleImageUpload}
            disabled={uploading}
            className="file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:bg-gray-200 hover:file:bg-gray-300"
          />
          {uploading && (
            <div className="flex items-center space-x-2 text-blue-600">
              <Loader2 className="animate-spin" size={20} />
              <span>Uploading...</span>
            </div>
          )}
        </div>
      </div>
      {originalImage && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={decreaseBrushSize}
                className="p-2 bg-gray-200 rounded"
                disabled={uploading}
              >
                <Minus size={20} />
              </button>
              <span>Brush Size: {brushRadius}</span>
              <button
                onClick={increaseBrushSize}
                className="p-2 bg-gray-200 rounded"
                disabled={uploading}
              >
                <Plus size={20} />
              </button>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={generateMask}
                className="p-2 bg-green-500 text-white rounded flex items-center"
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={20} />
                    Processing...
                  </>
                ) : (
                  <>
                    <Brush size={20} className="mr-2" /> Generate Mask
                  </>
                )}
              </button>
              <button
                onClick={clearCanvas}
                className="p-2 bg-red-500 text-white rounded"
                disabled={uploading}
              >
                <Trash2 size={20} className="mr-2" /> Clear Canvas
              </button>
            </div>
          </div>
          <div className="mb-4 border-2 border-gray-300">
            <CanvasDraw
              ref={canvasRef}
              brushRadius={brushRadius}
              brushColor="white"
              backgroundColor="black"
              canvasWidth={800}
              canvasHeight={600}
              imgSrc={originalImage}
              disabled={uploading}
            />
          </div>
        </div>
      )}
      {originalImage && maskImage && (
        <div className="flex space-x-4 mt-4">
          <div className="w-1/2">
            <h2 className="text-xl font-semibold mb-2">Original Image</h2>
            <img
              src={originalImage}
              alt="Original"
              className="max-w-full border-2 border-gray-300"
            />
          </div>
          <div className="w-1/2">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-xl font-semibold">Generated Mask</h2>
              <div className="flex space-x-2">
                <button
                  onClick={downloadMask}
                  className="p-2 bg-blue-500 text-white rounded flex items-center"
                  disabled={uploading}
                >
                  <Download size={20} className="mr-2" /> Download Mask
                </button>
              </div>
            </div>
            <img
              src={maskImage}
              alt="Mask"
              className="max-w-full border-2 border-gray-300"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MaskDrawingApp;
