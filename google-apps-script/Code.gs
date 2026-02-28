const BACKEND_URL = "https://your-domain.con/api/v1/cms/sync-lessons";
const CMS_SECRET = "bahnarsense-super-secret-google-sheets";

/**
 * Hàm Tạo Menu trên Google Sheets để Giáo viên dễ thao tác (Không cần code)
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('🔥 BahnarSense CMS')
      .addItem('Đồng bộ Dữ liệu Bài Học', 'syncLessonsToBackend')
      .addToUi();
}

/**
 * Hàm này sẽ đọc toàn bộ dữ liệu từ Sheet hiện tại và bắn POST sang Backend.
 */
function syncLessonsToBackend() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var dataRange = sheet.getDataRange();
  var values = dataRange.getDisplayValues(); // getDisplayValues() để lấy format string text

  if (values.length <= 1) {
    SpreadsheetApp.getUi().alert('Không có dữ liệu!');
    return;
  }

  // Row 1 là Header
  var headers = values[0];
  var payloads = [];

  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      // Ví dụ: header là lesson_id, type, chapter...
      obj[headers[j]] = row[j];
    }
    
    // Process JSON Array trong field questions nếu có
    if (obj['questions']) {
       try {
         obj['questions'] = JSON.parse(obj['questions']);
       } catch (e) {
         // Fallback pass text nếu ko phải Format json
       }
    }

    payloads.push(obj);
  }

  // Gọi HTTP POST
  var options = {
    'method' : 'post',
    'contentType': 'application/json',
    'headers': {
      'x-cms-secret': CMS_SECRET
    },
    'payload' : JSON.stringify({ data: payloads }),
    'muteHttpExceptions': true
  };

  try {
    var response = UrlFetchApp.fetch(BACKEND_URL, options);
    var resCode = response.getResponseCode();
    var resText = response.getContentText();

    if (resCode === 200) {
      SpreadsheetApp.getUi().alert('Thành công! Đã đẩy ' + payloads.length + ' dòng dữ liệu cập nhật.');
    } else {
      SpreadsheetApp.getUi().alert('Lỗi (' + resCode + '): ' + resText);
    }
  } catch (e) {
    SpreadsheetApp.getUi().alert('Gặp lỗi khi đồng bộ: ' + e.message);
  }
}
