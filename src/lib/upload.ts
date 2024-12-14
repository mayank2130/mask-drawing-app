import axios from "axios";

export const BACKEND_URL = "https://backend-psi-lemon-76.vercel.app";
export const CLOUDFRONT_URL = "https://d2yk3dckh7cww2.cloudfront.net";

export async function uploadImageToS3(
    original: boolean,
    file: File,
    getPresignedUrlEndpoint: string
  ): Promise<string> {
    try {
      // Get presigned URL from backend
      const response = await axios.get(getPresignedUrlEndpoint);
  
      const { preSignedUrl, fields } = response.data;
  
      // Create FormData for multipart upload
      const formData = new FormData();
      Object.keys(fields).forEach((key) => {
        formData.set(key, fields[key]);
      });
      formData.append("file", file);
  
      // Upload to S3 using presigned URL
      await axios.post(preSignedUrl, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
  
      console.log(fields["key"]);
      {
        original
          ? localStorage.setItem("original", fields["key"])
          : localStorage.setItem("mask", fields["key"]);
      }
      // Return the full URL of the uploaded image
      return `${CLOUDFRONT_URL}/${fields["key"]}`;
    } catch (error) {
      console.error("Image upload error:", error);
      throw error;
    }
  }

export async function dataUrlToFile(
    dataUrl: string,
    filename: string
  ): Promise<File> {
    // Validate input
    if (!dataUrl || typeof dataUrl !== "string") {
      throw new Error("Invalid data URL");
    }

    // Ensure the data URL is a PNG
    if (!dataUrl.startsWith("data:image/png")) {
      // If not a PNG, convert to PNG
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx?.drawImage(img, 0, 0);
          resolve();
        };
        img.onerror = reject;
        img.src = dataUrl;
      });

      dataUrl = canvas.toDataURL("image/png");
    }

    const response = await fetch(dataUrl);
    const blob = await response.blob();
    return new File([blob], filename, { type: "image/png" });
  }