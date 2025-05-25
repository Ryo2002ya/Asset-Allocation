document.addEventListener("DOMContentLoaded", function() {
  let csvData = null;
  let funds = [];

  const csvFileInput = document.getElementById("csvFileInput");
  const targetFundSelect = document.getElementById("targetFundSelect");
  const calcButton = document.getElementById("calcButton");
  const resultTextDiv = document.getElementById("resultText");
  const chartDiv = document.getElementById("frontierChart");

  // ファイルアップロード時の処理：CSV または Excel を処理
  csvFileInput.addEventListener("change", function(evt) {
    const file = evt.target.files[0];
    if (!file) return;
    
    if (file.name.endsWith(".csv")) {
      processCSV(file);
    } else if (file.name.endsWith(".xlsx")) {
      processExcel(file);
    } else {
      alert("CSVまたはExcelファイルをアップロードしてください。");
    }
  });

  // CSVファイル処理
  function processCSV(file) {
    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      complete: function(results) {
        csvData = results.data;
        csvData = csvData.filter(row => Object.keys(row).length > 1);
        funds = Object.keys(csvData[0]).filter(key => key !== "Date");
        updateTargetFundSelect();
      },
      error: function(error) {
        console.error("CSVパースエラー:", error);
      }
    });
  }

  // Excelファイル処理
  function processExcel(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      const headers = jsonData[0];  
      csvData = jsonData.slice(1).map(row => {
        let obj = {};
        headers.forEach((header, index) => {
          obj[header] = row[index];
        });
        return obj;
      });

      funds = headers.filter(key => key !== "Date");
      updateTargetFundSelect();
    };

    reader.readAsArrayBuffer(file);
  }

  // ターゲットファンド選択の UI を更新
  function updateTargetFundSelect() {
    targetFundSelect.innerHTML = "";
    funds.forEach(fund => {
      let option = document.createElement("option");
      option.value = fund;
      option.textContent = fund;
      targetFundSelect.appendChild(option);
    });
  }

  // 平均・分散・共分散計算
  function computeMean(arr) {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  function computeVariance(arr, mean) {
    return arr.reduce((acc, val) => acc + (val - mean) ** 2, 0) / arr.length;
  }

  function computeCovariance(arr1, mean1, arr2, mean2) {
    return arr1.reduce((sum, val, i) => sum + (val - mean1) * (arr2[i] - mean2), 0) / arr1.length;
  }

  // 計算ボタン押下時の処理
  calcButton.addEventListener("click", function() {
    if (!csvData) {
      alert("CSVまたはExcelファイルがアップロードされていません。");
      return;
    }
    let targetFund = targetFundSelect.value;
    if (!targetFund) {
      alert("ターゲットファンドを選択してください。");
      return;
    }

    let fundData = {};
    funds.forEach(fund => {
      fundData[fund] = csvData.map(row => parseFloat(row[fund])).filter(val => !isNaN(val));
    });

    let means = {};
    let variances = {};
    funds.forEach(fund => {
      let dataArr = fundData[fund];
      let mean = computeMean(dataArr);
      means[fund] = mean;
      variances[fund] = computeVariance(dataArr, mean);
    });

    let covMatrix = {};
    funds.forEach(fund1 => {
      covMatrix[fund1] = {};
      funds.forEach(fund2 => {
        covMatrix[fund1][fund2] = computeCovariance(fundData[fund1], means[fund1], fundData[fund2], means[fund2]);
      });
    });

    let results = [];
    funds.forEach(fund => {
      if (fund === targetFund) return;
      let sigmaTargetSq = variances[targetFund];
      let sigmaCandidateSq = variances[fund];
      let covTargetCandidate = covMatrix[targetFund][fund];
      
      let denominator = sigmaTargetSq + sigmaCandidateSq - 2 * covTargetCandidate;
      let wTarget = denominator !== 0 ? (sigmaCandidateSq - covTargetCandidate) / denominator : 0;
      wTarget = Math.max(0, Math.min(1, wTarget));
      let wCandidate = 1 - wTarget;

      let portReturn = wTarget * means[targetFund] + wCandidate * means[fund];
      let portVariance = (wTarget ** 2) * sigmaTargetSq + (wCandidate ** 2) * sigmaCandidateSq + 2 * wTarget * wCandidate * covTargetCandidate;
      let portRisk = Math.sqrt(portVariance);
      let sharpe = portRisk !== 0 ? portReturn / portRisk : NaN;

      results.push({ candidateFund: fund, weightTarget: wTarget, weightCandidate: wCandidate, portfolioReturn: portReturn, portfolioRisk: portRisk, sharpe: sharpe });
    });

    results.sort((a, b) => b.sharpe - a.sharpe);
    let bestCandidateResult = results[0];
    let bestCandidate = bestCandidateResult.candidateFund;

    let resultHTML = `<p>ターゲットファンド: <strong>${targetFund}</strong></p>`;
    resultHTML += `<p>最も効率的な組み合わせ候補: <strong>${bestCandidate}</strong></p>`;
    resultHTML += `<p>${targetFund} の保有比率: ${(bestCandidateResult.weightTarget * 100).toFixed(2)}%</p>`;
    resultHTML += `<p>${bestCandidate} の保有比率: ${(bestCandidateResult.weightCandidate * 100).toFixed(2)}%</p>`;
    resultHTML += `<p>ポートフォリオ期待リターン: ${bestCandidateResult.portfolioReturn.toFixed(4)}</p>`;
    resultHTML += `<p>ポートフォリオリスク: ${bestCandidateResult.portfolioRisk.toFixed(4)}</p>`;
    resultHTML += `<p>シャープレシオ: ${bestCandidateResult.sharpe.toFixed(4)}</p>`;

    resultTextDiv.innerHTML = resultHTML;
  });
});
