import type { SuppliersDatabase } from '../types/suppliers';

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3';
const FOLDER_NAME = 'AL EQFAL Suppliers';
const DATA_FILE_NAME = 'al_eqfal_suppliers_data.json';

export class DriveAuthError extends Error {
  constructor(message = 'Google Drive authorization expired or missing') {
    super(message);
    this.name = 'DriveAuthError';
  }
}

export function createEmptyDatabase(): SuppliersDatabase {
  return {
    version: 2,
    updatedAt: new Date().toISOString(),
    branches: [],
    users: [],
    suppliers: [],
    invoices: [],
    shiftsSales: [],
  };
}

async function driveFetch(url: string, accessToken: string, options: RequestInit = {}): Promise<Response> {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(options.headers || {}),
    },
  });

  if (res.status === 401 || res.status === 403) {
    throw new DriveAuthError(`Google Drive auth error (${res.status})`);
  }

  return res;
}

async function findOrCreateFolder(accessToken: string): Promise<string> {
  const q = encodeURIComponent(
    `mimeType='application/vnd.google-apps.folder' and name='${FOLDER_NAME}' and trashed=false`
  );
  const searchRes = await driveFetch(
    `${DRIVE_API_BASE}/files?q=${q}&fields=files(id,name)&spaces=drive`,
    accessToken
  );

  if (!searchRes.ok) {
    throw new Error(`Failed to search folder in Google Drive (${searchRes.status})`);
  }

  const searchData = (await searchRes.json()) as { files?: Array<{ id: string; name: string }> };
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  const createRes = await driveFetch(`${DRIVE_API_BASE}/files?fields=id`, accessToken, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });

  if (!createRes.ok) {
    throw new Error(`Failed to create folder in Google Drive (${createRes.status})`);
  }

  const created = (await createRes.json()) as { id: string };
  return created.id;
}

async function findDataFile(accessToken: string, folderId: string): Promise<string | null> {
  const qInFolder = encodeURIComponent(
    `name='${DATA_FILE_NAME}' and '${folderId}' in parents and trashed=false`
  );
  const res = await driveFetch(
    `${DRIVE_API_BASE}/files?q=${qInFolder}&fields=files(id,name,modifiedTime)&spaces=drive`,
    accessToken
  );

  if (!res.ok) {
    throw new Error(`Failed to query data file in Google Drive (${res.status})`);
  }

  const data = (await res.json()) as { files?: Array<{ id: string }> };
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }

  return null;
}

async function createDataFile(
  accessToken: string,
  folderId: string,
  initialDb: SuppliersDatabase
): Promise<string> {
  const boundary = 'al_eqfal_boundary_' + Date.now();
  const metadata = {
    name: DATA_FILE_NAME,
    mimeType: 'application/json',
    parents: [folderId],
  };

  const multipartBody =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(initialDb, null, 2)}\r\n` +
    `--${boundary}--`;

  const res = await driveFetch(
    `${DRIVE_UPLOAD_BASE}/files?uploadType=multipart&fields=id`,
    accessToken,
    {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to create data file in Google Drive (${res.status})`);
  }

  const created = (await res.json()) as { id: string };
  return created.id;
}

export async function loadDatabaseFromDrive(accessToken: string): Promise<{
  database: SuppliersDatabase;
  fileId: string;
  folderId: string;
}> {
  const folderId = await findOrCreateFolder(accessToken);
  let fileId = await findDataFile(accessToken, folderId);

  if (!fileId) {
    const emptyDb = createEmptyDatabase();
    fileId = await createDataFile(accessToken, folderId, emptyDb);
    return { database: emptyDb, fileId, folderId };
  }

  const contentRes = await driveFetch(`${DRIVE_API_BASE}/files/${fileId}?alt=media`, accessToken);
  if (!contentRes.ok) {
    throw new Error(`Failed to download data file from Google Drive (${contentRes.status})`);
  }

  try {
    const parsed = (await contentRes.json()) as Partial<SuppliersDatabase>;
    const normalized: SuppliersDatabase = {
      version: parsed.version || 2,
      updatedAt: parsed.updatedAt || new Date().toISOString(),
      branches: Array.isArray(parsed.branches) ? parsed.branches : [],
      users: Array.isArray(parsed.users) ? parsed.users : [],
      suppliers: Array.isArray(parsed.suppliers) ? parsed.suppliers : [],
      invoices: Array.isArray(parsed.invoices) ? parsed.invoices : [],
      shiftsSales: Array.isArray(parsed.shiftsSales) ? parsed.shiftsSales : [],
    };
    return { database: normalized, fileId, folderId };
  } catch {
    const emptyDb = createEmptyDatabase();
    return { database: emptyDb, fileId, folderId };
  }
}

export async function saveDatabaseToDrive(
  accessToken: string,
  fileId: string,
  database: SuppliersDatabase
): Promise<SuppliersDatabase> {
  const payload: SuppliersDatabase = {
    ...database,
    updatedAt: new Date().toISOString(),
  };

  const res = await driveFetch(
    `${DRIVE_UPLOAD_BASE}/files/${fileId}?uploadType=media&fields=id,modifiedTime`,
    accessToken,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify(payload, null, 2),
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to save data to Google Drive (${res.status})`);
  }

  return payload;
}
