csvFileInput.addEventListener("change", function(evt) {
  const file = evt.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith(".csv")) {
    // CSV処理
    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      complete: function(results) {
        handleParsedData(results.data);
      },
      error: function(error) {
        console.error("CSVパースエラー:", error);
      }
    });
  } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
    // Excel処理
    reader.onload = function(e) {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: null });
      handleParsedData(jsonData);
    };
    reader.readAsArrayBuffer(file);
  } else {
    alert("CSVまたはExcelファイル（.xlsx, .xls）をアップロードしてください。");
  }
});
