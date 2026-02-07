/**
 * Google Apps Script สำหรับ Money Tracker Pro
 *
 * วิธีใช้งาน:
 * 1. สร้าง Google Sheet ใหม่
 * 2. สร้าง 5 sheets: Transactions, Projects, Attendance, Advances, Staff
 * 3. เพิ่ม header row ตามโครงสร้างด้านล่าง
 * 4. ไปที่ Extensions > Apps Script
 * 5. วางโค้ดนี้ทั้งหมด
 * 6. Deploy > New deployment > Web app
 * 7. Execute as: Me, Who has access: Anyone
 * 8. Copy URL มาใส่ในแอป
 *
 * โครงสร้าง Sheet:
 * - Transactions: id, type, amount, category, projectId, description, date, createdBy
 * - Projects: id, name, client, status
 * - Attendance: staffId, month, workDays, lateDays, absentDays, leaveDays
 * - Advances: id, staffId, amount, date, description, month
 * - Staff: id, username, passwordHash, name, role, dailyWage, phone, startDate, active
 */

// ================== CONFIGURATION ==================
// ใส่ Spreadsheet ID ของคุณที่นี่
const SPREADSHEET_ID = '1nNuoOM3voTEhVEnB_VWsFAIoFS1s0Z1VyEQ2Yc3uJ78';

const SHEET_NAMES = {
  TRANSACTIONS: 'Transactions',
  PROJECTS: 'Projects',
  ATTENDANCE: 'Attendance',
  ADVANCES: 'Advances',
  STAFF: 'Staff'
};

// ================== UTILITY FUNCTIONS ==================

/**
 * ดึง Spreadsheet ตาม ID
 */
function getSpreadsheet() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

/**
 * ดึง Sheet ตามชื่อ
 */
function getSheet(sheetName) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);

  // สร้าง sheet ใหม่ถ้าไม่มี
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    initializeSheet(sheet, sheetName);
  }

  return sheet;
}

/**
 * สร้าง header row สำหรับ sheet ใหม่
 */
function initializeSheet(sheet, sheetName) {
  const headers = {
    [SHEET_NAMES.TRANSACTIONS]: ['id', 'type', 'amount', 'category', 'projectId', 'description', 'date', 'createdBy'],
    [SHEET_NAMES.PROJECTS]: ['id', 'name', 'client', 'status'],
    [SHEET_NAMES.ATTENDANCE]: ['staffId', 'month', 'workDays', 'lateDays', 'absentDays', 'leaveDays'],
    [SHEET_NAMES.ADVANCES]: ['id', 'staffId', 'amount', 'date', 'description', 'month'],
    [SHEET_NAMES.STAFF]: ['id', 'username', 'passwordHash', 'name', 'role', 'dailyWage', 'phone', 'startDate', 'active']
  };

  if (headers[sheetName]) {
    sheet.getRange(1, 1, 1, headers[sheetName].length).setValues([headers[sheetName]]);
    sheet.getRange(1, 1, 1, headers[sheetName].length).setFontWeight('bold');
  }
}

/**
 * แปลง Sheet data เป็น Array of Objects
 */
function sheetToObjects(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  const headers = data[0];
  const rows = data.slice(1);

  return rows.map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index];
    });
    return obj;
  }).filter(obj => obj.id || obj.staffId); // กรองแถวว่าง
}

/**
 * หา row index ตาม id
 */
function findRowById(sheet, id, idColumn = 'id') {
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idIndex = headers.indexOf(idColumn);

  if (idIndex === -1) return -1;

  for (let i = 1; i < data.length; i++) {
    if (data[i][idIndex] === id) {
      return i + 1; // 1-based index
    }
  }
  return -1;
}

/**
 * หา row index สำหรับ Attendance (composite key: staffId + month)
 */
function findAttendanceRow(sheet, staffId, month) {
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const staffIdIndex = headers.indexOf('staffId');
  const monthIndex = headers.indexOf('month');

  if (staffIdIndex === -1 || monthIndex === -1) return -1;

  for (let i = 1; i < data.length; i++) {
    if (data[i][staffIdIndex] === staffId && data[i][monthIndex] === month) {
      return i + 1;
    }
  }
  return -1;
}

// ================== CRUD OPERATIONS ==================

/**
 * อ่านข้อมูลทั้งหมดจากทุก Sheet
 */
function getAllData() {
  return {
    transactions: sheetToObjects(getSheet(SHEET_NAMES.TRANSACTIONS)),
    projects: sheetToObjects(getSheet(SHEET_NAMES.PROJECTS)),
    attendance: getAttendanceAsObject(),
    advances: sheetToObjects(getSheet(SHEET_NAMES.ADVANCES)),
    staff: sheetToObjects(getSheet(SHEET_NAMES.STAFF))
  };
}

/**
 * แปลง Attendance sheet เป็น nested object { staffId: { month: data } }
 */
function getAttendanceAsObject() {
  const rows = sheetToObjects(getSheet(SHEET_NAMES.ATTENDANCE));
  const result = {};

  rows.forEach(row => {
    if (!result[row.staffId]) {
      result[row.staffId] = {};
    }
    result[row.staffId][row.month] = {
      workDays: Number(row.workDays) || 0,
      lateDays: Number(row.lateDays) || 0,
      absentDays: Number(row.absentDays) || 0,
      leaveDays: Number(row.leaveDays) || 0
    };
  });

  return result;
}

// -------------------- Transactions --------------------

function addTransaction(data) {
  const sheet = getSheet(SHEET_NAMES.TRANSACTIONS);
  const headers = sheet.getRange(1, 1, 1, 8).getValues()[0];
  const row = headers.map(h => data[h] || '');
  sheet.appendRow(row);
  return { success: true, id: data.id };
}

function updateTransaction(data) {
  const sheet = getSheet(SHEET_NAMES.TRANSACTIONS);
  const rowIndex = findRowById(sheet, data.id);

  if (rowIndex === -1) {
    return { success: false, error: 'Transaction not found' };
  }

  const headers = sheet.getRange(1, 1, 1, 8).getValues()[0];
  const row = headers.map(h => data[h] || '');
  sheet.getRange(rowIndex, 1, 1, 8).setValues([row]);
  return { success: true, id: data.id };
}

function deleteTransaction(id) {
  const sheet = getSheet(SHEET_NAMES.TRANSACTIONS);
  const rowIndex = findRowById(sheet, id);

  if (rowIndex === -1) {
    return { success: false, error: 'Transaction not found' };
  }

  sheet.deleteRow(rowIndex);
  return { success: true, id: id };
}

// -------------------- Projects --------------------

function addProject(data) {
  const sheet = getSheet(SHEET_NAMES.PROJECTS);
  const headers = sheet.getRange(1, 1, 1, 4).getValues()[0];
  const row = headers.map(h => data[h] || '');
  sheet.appendRow(row);
  return { success: true, id: data.id };
}

function updateProject(data) {
  const sheet = getSheet(SHEET_NAMES.PROJECTS);
  const rowIndex = findRowById(sheet, data.id);

  if (rowIndex === -1) {
    return { success: false, error: 'Project not found' };
  }

  const headers = sheet.getRange(1, 1, 1, 4).getValues()[0];
  const row = headers.map(h => data[h] || '');
  sheet.getRange(rowIndex, 1, 1, 4).setValues([row]);
  return { success: true, id: data.id };
}

function deleteProject(id) {
  const sheet = getSheet(SHEET_NAMES.PROJECTS);
  const rowIndex = findRowById(sheet, id);

  if (rowIndex === -1) {
    return { success: false, error: 'Project not found' };
  }

  sheet.deleteRow(rowIndex);
  return { success: true, id: id };
}

// -------------------- Attendance --------------------

function saveAttendance(data) {
  const sheet = getSheet(SHEET_NAMES.ATTENDANCE);
  const rowIndex = findAttendanceRow(sheet, data.staffId, data.month);

  const headers = sheet.getRange(1, 1, 1, 6).getValues()[0];
  const row = headers.map(h => data[h] || '');

  if (rowIndex === -1) {
    // เพิ่มใหม่
    sheet.appendRow(row);
  } else {
    // อัพเดท
    sheet.getRange(rowIndex, 1, 1, 6).setValues([row]);
  }

  return { success: true, staffId: data.staffId, month: data.month };
}

// -------------------- Advances --------------------

function addAdvance(data) {
  const sheet = getSheet(SHEET_NAMES.ADVANCES);
  const headers = sheet.getRange(1, 1, 1, 6).getValues()[0];
  const row = headers.map(h => data[h] || '');
  sheet.appendRow(row);
  return { success: true, id: data.id };
}

function deleteAdvance(id) {
  const sheet = getSheet(SHEET_NAMES.ADVANCES);
  const rowIndex = findRowById(sheet, id);

  if (rowIndex === -1) {
    return { success: false, error: 'Advance not found' };
  }

  sheet.deleteRow(rowIndex);
  return { success: true, id: id };
}

// -------------------- Staff --------------------

function addStaff(data) {
  const sheet = getSheet(SHEET_NAMES.STAFF);
  const headers = sheet.getRange(1, 1, 1, 9).getValues()[0];
  const row = headers.map(h => data[h] !== undefined ? data[h] : '');
  sheet.appendRow(row);
  return { success: true, id: data.id };
}

function updateStaff(data) {
  const sheet = getSheet(SHEET_NAMES.STAFF);
  const rowIndex = findRowById(sheet, data.id);

  if (rowIndex === -1) {
    return { success: false, error: 'Staff not found' };
  }

  const headers = sheet.getRange(1, 1, 1, 9).getValues()[0];
  const row = headers.map(h => data[h] !== undefined ? data[h] : '');
  sheet.getRange(rowIndex, 1, 1, 9).setValues([row]);
  return { success: true, id: data.id };
}

function deleteStaff(id) {
  const sheet = getSheet(SHEET_NAMES.STAFF);
  const rowIndex = findRowById(sheet, id);

  if (rowIndex === -1) {
    return { success: false, error: 'Staff not found' };
  }

  sheet.deleteRow(rowIndex);
  return { success: true, id: id };
}

// ================== WEB APP ENDPOINTS ==================

/**
 * Handle GET requests - อ่านข้อมูล
 */
function doGet(e) {
  try {
    const action = e.parameter.action || 'getAll';
    let result;

    switch (action) {
      case 'getAll':
        result = getAllData();
        break;
      case 'getTransactions':
        result = sheetToObjects(getSheet(SHEET_NAMES.TRANSACTIONS));
        break;
      case 'getProjects':
        result = sheetToObjects(getSheet(SHEET_NAMES.PROJECTS));
        break;
      case 'getAttendance':
        result = getAttendanceAsObject();
        break;
      case 'getAdvances':
        result = sheetToObjects(getSheet(SHEET_NAMES.ADVANCES));
        break;
      case 'ping':
        result = { status: 'ok', timestamp: new Date().toISOString() };
        break;
      default:
        result = { error: 'Unknown action' };
    }

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle POST requests - เพิ่ม/แก้ไข/ลบข้อมูล
 */
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const { action, data } = payload;
    let result;

    switch (action) {
      // Transactions
      case 'addTransaction':
        result = addTransaction(data);
        break;
      case 'updateTransaction':
        result = updateTransaction(data);
        break;
      case 'deleteTransaction':
        result = deleteTransaction(data.id);
        break;

      // Projects
      case 'addProject':
        result = addProject(data);
        break;
      case 'updateProject':
        result = updateProject(data);
        break;
      case 'deleteProject':
        result = deleteProject(data.id);
        break;

      // Attendance
      case 'saveAttendance':
        result = saveAttendance(data);
        break;

      // Advances
      case 'addAdvance':
        result = addAdvance(data);
        break;
      case 'deleteAdvance':
        result = deleteAdvance(data.id);
        break;

      // Staff
      case 'addStaff':
        result = addStaff(data);
        break;
      case 'updateStaff':
        result = updateStaff(data);
        break;
      case 'deleteStaff':
        result = deleteStaff(data.id);
        break;

      // Bulk import (สำหรับ initial data)
      case 'bulkImport':
        result = bulkImport(data);
        break;

      default:
        result = { error: 'Unknown action' };
    }

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Bulk import สำหรับ initial data migration
 */
function bulkImport(data) {
  const results = {
    transactions: 0,
    projects: 0,
    attendance: 0,
    advances: 0
  };

  // Import transactions
  if (data.transactions && Array.isArray(data.transactions)) {
    data.transactions.forEach(t => {
      addTransaction(t);
      results.transactions++;
    });
  }

  // Import projects
  if (data.projects && Array.isArray(data.projects)) {
    data.projects.forEach(p => {
      addProject(p);
      results.projects++;
    });
  }

  // Import attendance
  if (data.attendance && typeof data.attendance === 'object') {
    Object.entries(data.attendance).forEach(([staffId, months]) => {
      Object.entries(months).forEach(([month, att]) => {
        saveAttendance({
          staffId,
          month,
          ...att
        });
        results.attendance++;
      });
    });
  }

  // Import advances
  if (data.advances && Array.isArray(data.advances)) {
    data.advances.forEach(a => {
      addAdvance(a);
      results.advances++;
    });
  }

  return { success: true, imported: results };
}

// ================== TESTING FUNCTIONS ==================

/**
 * ทดสอบการทำงานใน Apps Script Editor
 */
function testGetAll() {
  const result = getAllData();
  Logger.log(JSON.stringify(result, null, 2));
}

function testAddTransaction() {
  const result = addTransaction({
    id: 'T_TEST_' + Date.now(),
    type: 'expense',
    amount: 100,
    category: 'ค่าทดสอบ',
    projectId: 'P001',
    description: 'รายการทดสอบ',
    date: new Date().toISOString().split('T')[0],
    createdBy: 'admin'
  });
  Logger.log(result);
}

/**
 * Debug function - ตรวจสอบสถานะ Sheets
 */
function debugSheets() {
  const ss = getSpreadsheet();
  Logger.log('Spreadsheet Name: ' + ss.getName());
  Logger.log('Spreadsheet ID: ' + ss.getId());

  const sheets = ss.getSheets();
  Logger.log('Number of sheets: ' + sheets.length);

  sheets.forEach(sheet => {
    const name = sheet.getName();
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    Logger.log('Sheet: ' + name + ' - Rows: ' + lastRow + ', Cols: ' + lastCol);

    if (lastRow > 0) {
      const data = sheet.getDataRange().getValues();
      Logger.log('Headers: ' + JSON.stringify(data[0]));
      if (lastRow > 1) {
        Logger.log('First row: ' + JSON.stringify(data[1]));
      }
    }
  });
}

/**
 * สร้าง Sheets ทั้งหมดพร้อม headers
 */
function setupSheets() {
  const ss = getSpreadsheet();

  Object.values(SHEET_NAMES).forEach(sheetName => {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      Logger.log('Created sheet: ' + sheetName);
    }
    initializeSheet(sheet, sheetName);
    Logger.log('Initialized sheet: ' + sheetName);
  });

  return 'Setup complete!';
}
