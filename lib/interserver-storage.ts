import { Client } from 'basic-ftp';

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
    publicUrl: process.env.INTERSERVER_PUBLIC_URL || 'https://storage2200.is.cc/uploads/',
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
  
  try {
    console.log('[interserver] Connecting to FTP:', config.host);
    
    // Connect to FTP server
    await client.access({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      secure: false, // Use FTPS if needed
    });
    
    console.log('[interserver] Connected successfully');
    
    // Ensure upload directory exists
    try {
      await client.ensureDir(config.uploadDir);
    } catch (err) {
      console.warn('[interserver] Directory may already exist:', err);
    }
    
    // Upload file
    const remotePath = `${config.uploadDir}${filename}`;
    console.log('[interserver] Uploading to:', remotePath);
    
    await client.uploadFrom(
      Buffer.from(buffer) as any,
      remotePath
    );
    
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
