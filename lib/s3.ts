import { 
  PutObjectCommand, 
  GetObjectCommand, 
  DeleteObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createS3Client, getBucketConfig } from "./aws-config";

let _s3: ReturnType<typeof createS3Client> | null = null;
function getS3Client() {
  if (!_s3) _s3 = createS3Client();
  return _s3;
}

/**
 * Generate presigned URL for uploading files directly from client
 * For files <= 100MB (works up to 5GB max, but multipart recommended for >100MB)
 */
export async function generatePresignedUploadUrl(
  fileName: string,
  contentType: string,
  isPublic: boolean = false
) {
  const { bucketName, folderPrefix } = getBucketConfig();
  
  // Generate cloud storage path
  const cloud_storage_path = isPublic
    ? `${folderPrefix}public/uploads/${Date.now()}-${fileName}`
    : `${folderPrefix}uploads/${Date.now()}-${fileName}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: cloud_storage_path,
    ContentType: contentType,
    ContentDisposition: isPublic ? "attachment" : undefined
  });

  const uploadUrl = await getSignedUrl(getS3Client(), command, { expiresIn: 3600 });

  return { uploadUrl, cloud_storage_path };
}

/**
 * Initiate multipart upload for large files (>100MB)
 * Required for files >5GB, recommended for >100MB
 */
export async function initiateMultipartUpload(
  fileName: string,
  isPublic: boolean = false
) {
  const { bucketName, folderPrefix } = getBucketConfig();
  
  const cloud_storage_path = isPublic
    ? `${folderPrefix}public/uploads/${Date.now()}-${fileName}`
    : `${folderPrefix}uploads/${Date.now()}-${fileName}`;

  const command = new CreateMultipartUploadCommand({
    Bucket: bucketName,
    Key: cloud_storage_path,
    ContentDisposition: isPublic ? "attachment" : undefined
  });

  const response = await getS3Client().send(command);
  
  return { 
    uploadId: response.UploadId!, 
    cloud_storage_path 
  };
}

/**
 * Get presigned URL for uploading a single part in multipart upload
 */
export async function getPresignedUrlForPart(
  cloud_storage_path: string,
  uploadId: string,
  partNumber: number
) {
  const { bucketName } = getBucketConfig();

  const command = new UploadPartCommand({
    Bucket: bucketName,
    Key: cloud_storage_path,
    UploadId: uploadId,
    PartNumber: partNumber
  });

  return await getSignedUrl(getS3Client(), command, { expiresIn: 3600 });
}

/**
 * Complete multipart upload after all parts are uploaded
 */
export async function completeMultipartUpload(
  cloud_storage_path: string,
  uploadId: string,
  parts: Array<{ ETag: string; PartNumber: number }>
) {
  const { bucketName } = getBucketConfig();

  const command = new CompleteMultipartUploadCommand({
    Bucket: bucketName,
    Key: cloud_storage_path,
    UploadId: uploadId,
    MultipartUpload: { Parts: parts }
  });

  await getS3Client().send(command);
}

/**
 * Get URL for accessing/downloading a file
 * Returns public URL for public files, signed URL for private files
 */
export async function getFileUrl(
  cloud_storage_path: string,
  isPublic: boolean = false
): Promise<string> {
  const { bucketName } = getBucketConfig();
  
  if (isPublic) {
    // For public files, return direct URL
    const region = process.env.AWS_REGION || "us-east-1";
    return `https://${bucketName}.s3.${region}.amazonaws.com/${cloud_storage_path}`;
  } else {
    // For private files, generate signed URL with expiry
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: cloud_storage_path,
      ResponseContentDisposition: "attachment"
    });
    
    return await getSignedUrl(getS3Client(), command, { expiresIn: 3600 });
  }
}

/**
 * Delete a file from S3
 */
export async function deleteFile(cloud_storage_path: string) {
  const { bucketName } = getBucketConfig();

  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: cloud_storage_path
  });

  await getS3Client().send(command);
}
