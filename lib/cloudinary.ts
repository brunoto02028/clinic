import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;

/**
 * Upload image to Cloudinary
 * @param buffer - Image buffer
 * @param filename - Original filename
 * @param folder - Cloudinary folder (default: 'clinic-uploads')
 * @returns Cloudinary upload result with secure_url
 */
export async function uploadToCloudinary(
  buffer: Buffer,
  filename: string,
  folder: string = 'clinic-uploads'
): Promise<{ url: string; publicId: string }> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: filename.replace(/\.[^/.]+$/, ''), // Remove extension
        resource_type: 'auto',
        overwrite: true,
      },
      (error, result) => {
        if (error) {
          console.error('[cloudinary] Upload error:', error);
          reject(error);
        } else if (result) {
          console.log('[cloudinary] Upload success:', result.secure_url);
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        } else {
          reject(new Error('Upload failed - no result'));
        }
      }
    );

    uploadStream.end(buffer);
  });
}

/**
 * Delete image from Cloudinary
 * @param publicId - Cloudinary public ID
 */
export async function deleteFromCloudinary(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId);
    console.log('[cloudinary] Deleted:', publicId);
  } catch (error) {
    console.error('[cloudinary] Delete error:', error);
    throw error;
  }
}
