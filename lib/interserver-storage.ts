import { Client } from 'basic-ftp';
import { Readable } from 'stream';

interface InterServerConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  uploadDir: string;
  publicUrl: string;
}

function getInterServerConfig(): InterServerConfig {
  return {
    host: process.env.INTERSERVER_HOST || '67.217.57.194',
    port: parseInt(process.env.INTERSERVER_PORT || '21'),
    user: process.env.INTERSERVER_USER || 'st74638',
    password: process.env.INTERSERVER_PASSWORD || '',
    uploadDir: process.env.INTERSERVER_UPLOAD_DIR || '/uploads/',
    publicUrl: process.env.INTERSERVER_PUBLIC_URL || 'http://67.217.57.194/uploads/',
  };
}

/**
 * Upload file to InterServer via FTP
 */
export async function uploadToInterServer(
  buffer: Buffer,
  filename: string
): Promise<string> {
  const config = getInterServerConfig();
  const client = new Client();
  client.ftp.verbose = false; // Disable verbose logging
  
  try {
    console.log('[interserver] Connecting to FTP:', config.host);
    
    // Connect to FTP server
    await client.access({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      secure: false,
    });
    
    console.log('[interserver] Connected successfully');
    
    // Ensure upload directory exists
    try {
      await client.ensureDir(config.uploadDir);
    } catch (err) {
      console.warn('[interserver] Directory may already exist');
    }
    
    // Upload file - convert Buffer to Readable stream
    const remotePath = `${config.uploadDir}${filename}`;
    console.log('[interserver] Uploading to:', remotePath);
    
    const stream = Readable.from(buffer);
    await client.uploadFrom(stream, remotePath);
    
    console.log('[interserver] Upload successful');
    
    // Return public URL
    const publicUrl = `${config.publicUrl}${filename}`;
    return publicUrl;
    
  } catch (error: any) {
    console.error('[interserver] Upload failed:', error.message);
    throw new Error(`InterServer upload failed: ${error.message}`);
  } finally {
    client.close();
  }
}

/**
 * Delete file from InterServer via FTP
 */
export async function deleteFromInterServer(filename: string): Promise<void> {
  const config = getInterServerConfig();
  const client = new Client();
  
  try {
    await client.access({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      secure: false,
    });
    
    const remotePath = `${config.uploadDir}${filename}`;
    await client.remove(remotePath);
    
    console.log('[interserver] File deleted:', remotePath);
  } catch (error: any) {
    console.error('[interserver] Delete failed:', error.message);
    throw new Error(`InterServer delete failed: ${error.message}`);
  } finally {
    client.close();
  }
}

/**
 * Check if InterServer is configured
 */
export function isInterServerConfigured(): boolean {
  const config = getInterServerConfig();
  return !!(config.host && config.user && config.password);
}
