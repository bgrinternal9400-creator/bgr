
// =======================================================================
// === BGR UNIFIED BACKEND — BOMBAY GOBINDGARH ROADWAYS ===
// =======================================================================
// Unified script for Driver Portal and Broker Portal data saving.
// NOTE: Image saving to Google Drive is skipped as per user request.
// =======================================================================


// ===================================
// ⚙️ CONFIGURATION
// ===================================
const DRIVER_SHEET_NAME = "BGR_Driver_Submissions";
const BROKER_SHEET_NAME = "BGR_Broker_Submissions";
const CREDENTIALS_SHEET_NAME = "cred";
const ERROR_LOG_SHEET_NAME = "Error_Logs";
const DRIVE_FOLDER_ID = "YOUR_GOOGLE_DRIVE_FOLDER_ID"; // Optional: Parent folder for submissions


// ===================================
// 🚀 MAIN HANDLERS
// ===================================

/**
 * Handles HTTP GET requests for broker authentication.
 */
function doGet(e) {
  try {
    const action = e.parameter.action;

    // Broker Login
    if (action === 'brokerLogin') {
      const response = handleBrokerLogin(e.parameter.user, e.parameter.pass);
      return createJsonResponse(response);
    }

    // Default response
    return createJsonResponse({ result: 'info', message: 'BGR Unified Backend (Data Only) is running.' });

  } catch (err) {
    logError('doGet', err);
    return createJsonResponse({ result: 'error', detail: err.message });
  }
}

/**
 * Handles HTTP POST requests for Driver and Broker submissions.
 */
function doPost(e) {
  try {
    let params = e.parameter || {};
    let postDataContents = e.postData ? e.postData.contents : null;

    // 1. If parameters are empty or missing 'action', try to parse the body.
    if (!params.action && postDataContents) {
      // Try parsing as JSON first
      try {
        const payload = JSON.parse(postDataContents);
        params = payload;
      } catch (err) {
        // If JSON parsing fails, try parsing as URL-encoded string (common with no-cors)
        const parts = postDataContents.split('&');
        const decodedParams = {};
        parts.forEach(part => {
          const [key, value] = part.split('=');
          if (key) decodedParams[decodeURIComponent(key)] = decodeURIComponent(value || '');
        });
        
        // If we found any parameters (like 'action'), update params
        if (Object.keys(decodedParams).length > 0) {
          params = decodedParams;
        }
      }
    }

    // 2. Log the processed parameters for debugging if they are still missing action
    if (!params.action && !params.tripId && !params.abilityNum) {
      logError('doPost (Data Debug)', new Error('Received payload: ' + JSON.stringify(params) + ' | Raw: ' + postDataContents));
    }

    // 3. Identify the action and route to the appropriate handler.
    const action = params.action;

    // Driver Submission
    if (action === 'driverSubmit' || params.tripId || params.abilityNum) {
      const response = handleDriverSubmission(params);
      return createJsonResponse(response);
    }

    // Broker Submission
    if (action === 'brokerSubmit') {
      const response = handleBrokerSubmission(params);
      return createJsonResponse(response);
    }

    throw new Error("Invalid POST request format or missing action. Parameters: " + JSON.stringify(params));

  } catch (err) {
    logError('doPost', err);
    return createJsonResponse({ result: 'error', detail: err.message });
  }
}


// ===================================
// 🚚 DRIVER LOGIC
// ===================================

function handleDriverSubmission(payload) {
  const sheet = getOrCreateSheet(DRIVER_SHEET_NAME, [
    'Trip ID', 'Ability Number', 'Timestamp', 'Driver Name', 'Truck Number', 'Phone',
    'Route', 'Cargo Type', 'GPS Location', 'Photo URL', 'Doc 1 URL', 'Doc 2 URL'
  ]);

  const parentFolder = getDriveFolder();
  // Create folder with Ability Number as requested
  const folderName = payload.abilityNum || payload.tripId || "Unknown_Ability";
  const tripFolder = parentFolder.createFolder(`${folderName}_${new Date().toISOString()}`);

  // Handle files (parsing if sent as JSON strings from URLSearchParams)
  const pFile = payload.photoFile ? (typeof payload.photoFile === 'string' ? JSON.parse(payload.photoFile) : payload.photoFile) : null;
  const d1File = payload.doc1File ? (typeof payload.doc1File === 'string' ? JSON.parse(payload.doc1File) : payload.doc1File) : null;
  const d2File = payload.doc2File ? (typeof payload.doc2File === 'string' ? JSON.parse(payload.doc2File) : payload.doc2File) : null;

  const photoUrl = saveFileToDrive(pFile, `Photo_${folderName}`, tripFolder);
  const doc1Url = saveFileToDrive(d1File, `Doc1_${folderName}`, tripFolder);
  const doc2Url = saveFileToDrive(d2File, `Doc2_${folderName}`, tripFolder);

  sheet.appendRow([
    payload.tripId || '', 
    payload.abilityNum || '',
    payload.timestamp || '', 
    payload.driverName || '', 
    payload.truckNo || '',
    payload.phone || '', 
    payload.route || '', 
    payload.cargoType || '', 
    payload.gps || '',
    photoUrl || 'N/A',
    doc1Url || 'N/A',
    doc2Url || 'N/A'
  ]);

  return { result: 'success', tripId: payload.tripId || payload.abilityNum };
}


// ===================================
// 🔐 BROKER LOGIC
// ===================================

function handleBrokerLogin(user, pass) {
  if (!user || !pass) throw new Error("Username and password required.");

  const sheet = getOrCreateSheet(CREDENTIALS_SHEET_NAME, ['Username', 'Password', 'TransportName']);
  const data = sheet.getDataRange().getValues();

  // Setup defaults if empty (including demo account)
  if (data.length <= 1) {
    sheet.appendRow(['broker1', 'pass123', 'Deluxe Transport']);
    sheet.appendRow(['broker2', 'pass456', 'Golden Carriers']);
    sheet.appendRow(['demo', 'demo123', 'Demo Transport']);
    return handleBrokerLogin(user, pass); // Re-run with new data
  }

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === user && data[i][1] === pass) {
      return { result: 'success', detail: data[i][2] };
    }
  }
  throw new Error('Invalid credentials.');
}

function handleBrokerSubmission(params) {
  const sheet = getOrCreateSheet(BROKER_SHEET_NAME, [
    'Timestamp', 'Transport Name', 'Truck Number', 'GR Number', 'GPS Location', 'Photo 1 URL', 'Photo 2 URL'
  ]);

  const parentFolder = getDriveFolder();
  const folderName = params.grNo || "Unknown_GR";
  const submissionFolder = parentFolder.createFolder(`Broker_${folderName}_${new Date().toISOString()}`);

  const p1 = params.photo1 ? (typeof params.photo1 === 'string' ? JSON.parse(params.photo1) : params.photo1) : null;
  const p2 = params.photo2 ? (typeof params.photo2 === 'string' ? JSON.parse(params.photo2) : params.photo2) : null;

  const photo1Url = saveFileToDrive(p1, `GR_Copy_${folderName}`, submissionFolder);
  const photo2Url = saveFileToDrive(p2, `Loading_Photo_${folderName}`, submissionFolder);

  sheet.appendRow([
    params.timestamp || '', 
    params.transportName || '', 
    params.truckNo || '', 
    params.grNo || '',
    params.gps || '',
    photo1Url || 'N/A',
    photo2Url || 'N/A'
  ]);

  return { result: 'success' };
}


// ===================================
// 🛠️ UTILITIES
// ===================================

function getOrCreateSheet(sheetName, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    if (headers) {
      sheet.appendRow(headers);
      sheet.setFrozenRows(1);
    }
  }
  return sheet;
}

function logError(fn, err) {
  try {
    const sheet = getOrCreateSheet(ERROR_LOG_SHEET_NAME, ['Time', 'Func', 'Msg', 'Stack']);
    sheet.appendRow([new Date(), fn, err.message, err.stack || '']);
  } catch (e) {
    console.error(err);
  }
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getDriveFolder() {
  return DRIVE_FOLDER_ID !== "YOUR_GOOGLE_DRIVE_FOLDER_ID" 
    ? DriveApp.getFolderById(DRIVE_FOLDER_ID) 
    : DriveApp.getRootFolder();
}

function saveFileToDrive(fileData, fileName, folder) {
  if (!fileData || !fileData.base64) return 'N/A';
  try {
    const decoded = Utilities.base64Decode(fileData.base64.split(',')[1]);
    const blob = Utilities.newBlob(decoded, fileData.type, fileName);
    return folder.createFile(blob).getUrl();
  } catch (err) {
    logError('saveFileToDrive', err);
    return 'Error';
  }
}
