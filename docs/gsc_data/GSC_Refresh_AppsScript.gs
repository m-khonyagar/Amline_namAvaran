/**
 * GSC Data Refresh - Google Apps Script
 * Add this to your Google Sheet: Extensions > Apps Script > paste & save
 * Then: Insert > Drawing > create "Refresh" button > Assign script: refreshGSCData
 * 
 * Requires: Your Google account must have access to amline.ir in Search Console
 */
var SITE_URL = 'https://amline.ir/';
var SPREADSHEET_ID = '1qFynl6JMLbT55ucqXe2zQ7w710JCpkhlxHYvZDC8oEA';
var SITE_URL_ENCODED = encodeURIComponent(SITE_URL);
var DAYS_BACK = 90;

function getDates() {
  var end = new Date();
  var start = new Date();
  start.setDate(start.getDate() - DAYS_BACK);
  return {
    startDate: Utilities.formatDate(start, 'Asia/Tehran', 'yyyy-MM-dd'),
    endDate: Utilities.formatDate(end, 'Asia/Tehran', 'yyyy-MM-dd')
  };
}

function callGSC(dimensions, rowLimit, startRow) {
  var dates = getDates();
  var payload = {
    startDate: dates.startDate,
    endDate: dates.endDate,
    dimensions: dimensions,
    rowLimit: rowLimit || 2500,
    startRow: startRow || 0
  };
  var url = 'https://www.googleapis.com/webmasters/v3/sites/' + SITE_URL_ENCODED + '/searchAnalytics/query';
  var options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    headers: { 'Authorization': 'Bearer ' + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true
  };
  var resp = UrlFetchApp.fetch(url, options);
  var code = resp.getResponseCode();
  if (code !== 200) {
    throw new Error('GSC API error ' + code + ': ' + resp.getContentText());
  }
  return JSON.parse(resp.getContentText());
}

function rowsToData(rows, keys) {
  var out = [];
  if (!rows || rows.length === 0) return { values: [] };
  var headers = keys.concat(['clicks', 'impressions', 'ctr', 'position']);
  out.push(headers);
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    var row = [];
    for (var k = 0; k < keys.length; k++) {
      row.push(r.keys && r.keys[k] !== undefined ? r.keys[k] : '');
    }
    row.push(r.clicks || 0, r.impressions || 0, ((r.ctr || 0) * 100).toFixed(4), (r.position || 0).toFixed(2));
    out.push(row);
  }
  return { values: out };
}

function getSpreadsheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss || SpreadsheetApp.openById(SPREADSHEET_ID);
}

function ensureSheet(name) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

function writeSheet(name, data) {
  var sheet = ensureSheet(name);
  sheet.clear();
  if (data.values && data.values.length > 0) {
    sheet.getRange(1, 1, data.values.length, data.values[0].length).setValues(data.values);
    sheet.getRange(1, 1, 1, data.values[0].length).setFontWeight('bold');
  }
}

function fetchAllQueries() {
  var all = [];
  var start = 0;
  var limit = 2500;
  while (true) {
    var resp = callGSC(['query'], limit, start);
    var rows = resp.rows || [];
    if (rows.length === 0) break;
    for (var i = 0; i < rows.length; i++) {
      all.push(rows[i]);
    }
    if (rows.length < limit) break;
    start += limit;
  }
  return all;
}

function refreshGSCData() {
  var ui = SpreadsheetApp.getUi();
  ui.alert('در حال به\u200cروزرسانی... لطفاً صبر کنید.');
  
  try {
    var dates = getDates();
    
    // Meta
    var metaSheet = ensureSheet('Meta');
    metaSheet.clear();
    metaSheet.getRange(1, 1, 4, 2).setValues([
      ['siteUrl', SITE_URL],
      ['startDate', dates.startDate],
      ['endDate', dates.endDate],
      ['lastUpdated', new Date().toISOString()]
    ]);
    metaSheet.getRange(1, 1, 4, 1).setFontWeight('bold');
    
    // By date
    var r = callGSC(['date']);
    var d = rowsToData(r.rows || [], ['date']);
    if (d.values.length) writeSheet('Performance_by_Date', d);
    
    // By query (paginated)
    var queryRows = fetchAllQueries();
    var qd = rowsToData(queryRows, ['query']);
    if (qd.values.length) writeSheet('Queries', qd);
    
    // By page
    r = callGSC(['page'], 2500);
    d = rowsToData(r.rows || [], ['page']);
    if (d.values.length) writeSheet('Pages', d);
    
    // By country
    r = callGSC(['country'], 500);
    d = rowsToData(r.rows || [], ['country']);
    if (d.values.length) writeSheet('By_Country', d);
    
    // By device
    r = callGSC(['device'], 100);
    d = rowsToData(r.rows || [], ['device']);
    if (d.values.length) writeSheet('By_Device', d);
    
    // Date + Device
    r = callGSC(['date', 'device'], 2000);
    d = rowsToData(r.rows || [], ['date', 'device']);
    if (d.values.length) writeSheet('Date_Device', d);
    
    // Date + Country (sample)
    r = callGSC(['date', 'country'], 3000);
    d = rowsToData(r.rows || [], ['date', 'country']);
    if (d.values.length) writeSheet('Date_Country', d);
    
    // Query + Page
    r = callGSC(['query', 'page'], 2000);
    d = rowsToData(r.rows || [], ['query', 'page']);
    if (d.values.length) writeSheet('Query_Page', d);
    
    // Add refresh button instruction to Meta
    metaSheet.getRange(6, 1).setValue('برای به\u200cروزرسانی مجدد روی دکمه Refresh کلیک کنید.');
    metaSheet.getRange(6, 1).setFontWeight('bold');
    
    ui.alert('به\u200cروزرسانی با موفقیت انجام شد.');
  } catch (e) {
    ui.alert('خطا: ' + e.message + '\n\nاطمینان حاصل کنید که به گوگل سرچ کنسول (amline.ir) دسترسی دارید.');
  }
}

function onOpen() {
  try {
    getSpreadsheet().getUi()
      .createMenu('GSC')
      .addItem('به\u200cروزرسانی داده\u200cها', 'refreshGSCData')
      .addToUi();
  } catch (e) {}
}
