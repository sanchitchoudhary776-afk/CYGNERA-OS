// ═══════════════════════════════════════════════════════════════
//  AXINITE OS · GOOGLE DRIVE BACKUP & RESTORE BRIDGE
//  Architecture: Client-side integration using the Google Drive REST API.
//  Enables students to save complete, uncompressed, uncompromised
//  historical months of data on their own free Google Drive (15GB).
// ═══════════════════════════════════════════════════════════════

import toast from 'react-hot-toast';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const BACKUP_FILE_NAME = 'AxiniteOS_Workspace_Backup.json';
const DRIVE_TOKEN_KEY = 'ax_drive_access_token';
const DRIVE_LINKED_KEY = 'ax_drive_is_linked';

export const driveSync = {
  /**
   * Check if the user has linked their Google Drive.
   */
  isLinked() {
    return localStorage.getItem(DRIVE_LINKED_KEY) === 'true';
  },

  /**
   * Get the saved access token.
   */
  getToken() {
    return localStorage.getItem(DRIVE_TOKEN_KEY);
  },

  /**
   * Link Google Drive using the Google Identity Services token client.
   * If running in a web browser, we dynamically load the GIS script if not present.
   */
  async linkDrive() {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') return reject('Window undefined');

      // 1. Ensure Google Identity Services script is loaded
      if (!window.google) {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => this.requestToken(resolve, reject);
        script.onerror = () => reject(new Error('Failed to load Google API script'));
        document.head.appendChild(script);
      } else {
        this.requestToken(resolve, reject);
      }
    });
  },

  requestToken(resolve, reject) {
    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID || 'your_google_client_id_here',
        scope: 'https://www.googleapis.com/auth/drive.file',
        callback: (response) => {
          if (response.error) {
            console.error('[Google Drive] Auth error:', response.error);
            reject(response);
            return;
          }
          
          localStorage.setItem(DRIVE_TOKEN_KEY, response.access_token);
          localStorage.setItem(DRIVE_LINKED_KEY, 'true');
          toast.success('Successfully linked Google Drive! ☁️', { id: 'drive_link' });
          resolve(response.access_token);
        },
      });
      client.requestAccessToken({ prompt: 'consent' });
    } catch (err) {
      console.error('[Google Drive] Client init error:', err);
      reject(err);
    }
  },

  /**
   * Unlink Google Drive.
   */
  unlinkDrive() {
    localStorage.removeItem(DRIVE_TOKEN_KEY);
    localStorage.setItem(DRIVE_LINKED_KEY, 'false');
    toast.success('Disconnected Google Drive backups.');
  },

  /**
   * Lossless Backup: upload complete state JSON directly to user's Drive.
   */
  async backup(state) {
    if (!this.isLinked()) return false;
    const token = this.getToken();
    if (!token) return false;

    try {
      // 1. Check if backup file already exists on Drive
      const fileId = await this.findBackupFile(token);
      
      const metadata = {
        name: BACKUP_FILE_NAME,
        mimeType: 'application/json',
      };
      
      const boundary = 'axinite_os_multipart_boundary';
      const multipartBody = 
        `\r\n--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}` +
        `\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(state)}` +
        `\r\n--${boundary}--`;

      const url = fileId
        ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`
        : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
      
      const method = fileId ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartBody,
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired, clear and request re-link
          this.unlinkDrive();
          toast.error('Google Drive session expired. Please re-link in settings.');
          return false;
        }
        throw new Error(`Drive HTTP error ${response.status}`);
      }

      console.log('[Google Drive] ✓ Lossless backup uploaded successfully');
      return true;
    } catch (err) {
      console.error('[Google Drive] Backup upload failed:', err);
      return false;
    }
  },

  /**
   * Lossless Restore: download backup state JSON from user's Drive.
   */
  async restore() {
    if (!this.isLinked()) {
      toast.error('Please link your Google Drive first.');
      return null;
    }
    const token = this.getToken();
    if (!token) return null;

    try {
      const fileId = await this.findBackupFile(token);
      if (!fileId) {
        toast.error(`No previous workspace backup file named "${BACKUP_FILE_NAME}" found on your Drive.`);
        return null;
      }

      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error(`Drive download HTTP error ${response.status}`);
      }

      const restoredData = await response.json();
      toast.success('Successfully restored full workspace from Google Drive! 🎯');
      return restoredData;
    } catch (err) {
      console.error('[Google Drive] Restore failed:', err);
      toast.error(`Restore failed: ${err.message}`);
      return null;
    }
  },

  /**
   * Helper: search for our specific backup file name on Google Drive.
   */
  async findBackupFile(token) {
    try {
      const q = encodeURIComponent(`name = '${BACKUP_FILE_NAME}' and trashed = false`);
      const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error(`Drive query status ${response.status}`);
      
      const data = await response.json();
      return data.files?.[0]?.id || null;
    } catch (err) {
      console.error('[Google Drive] Error locating backup file:', err);
      return null;
    }
  }
};
