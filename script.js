document.addEventListener("DOMContentLoaded", function () {
  let csvData = null;
  let funds = [];

  const csvFileInput = document.getElementById("csvFileInput");
  const targetFundSelect = document.getElementById("targetFundSelect");
  const calcButton = document.getElementById("calcButton");
  const resultTextDiv = document.getElementById("resultText");
  const chartDiv = document.getElementById("frontierChart");

  // ---------- ファイル読み込み ----------
  csvFileInput.addEventListener("change", function (evt) {
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

  function processCSV(file) {
    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      complete: results => {
        csvData = results.data.filter(row => Object.keys(row).length > 1);
        funds = Object.keys(csvData[0]).filter(key => key !== "Date");
        updateTargetFundSelect();
      },
      error: error => console.error("CSVパースエラー:", error)
    });
  }

  function processExcel(file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
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

  function updateTargetFundSelect() {
    targetFundSelect.innerHTML = "";
    funds.forEach(fund => {
      let option = document.createElement("option");
      option.value = fund;
      option.textContent = fund;
      targetFundSelect.appendChild(option);
    });
  }

  // ---------- 数値計算ユーティリティ ----------
  const computeMean = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
  const computeVariance = (arr, mean) => arr.reduce((acc, val) => acc + (val - mean) ** 2, 0) / arr.length;
  const computeCovariance = (arr1, mean1, arr2, mean2) =>
    arr1.reduce((sum, val, i) => sum + (val - mean1) * (arr2[i] - mean2), 0) / arr1.length;

  // ---------- 計算メイン処理 ----------
  calcButton.addEventListener("click", function () {
    if (!csvData) return alert("ファイルが未アップロードです。");

    const targetFund = targetFundSelect.value;
    if (!targetFund) return alert("ターゲットファンドを選択してください。");

    const fundData = {};
    funds.forEach(fund => {
      fundData[fund] = csvData.map(row => parseFloat(row[fund])).filter(val => !isNaN(val));
    });

    const means = {}, variances = {}, covMatrix = {};
    funds.forEach(fund => {
      const dataArr = fundData[fund];
      const mean = computeMean(dataArr);
      means[fund] = mean;
      variances[fund] = computeVariance(dataArr, mean);
    });

    funds.forEach(f1 => {
      covMatrix[f1] = {};
      funds.forEach(f2 => {
        covMatrix[f1][f2] = computeCovariance(fundData[f1], means[f1], fundData[f2], means[f2]);
      });
    });

    // 2ファンド組み合わせによる効率性検証
    const results = funds
      .filter(f => f !== targetFund)
      .map(fund => {
        const vt = variances[targetFund], vc = variances[fund], cov = covMatrix[targetFund][fund];
        const denom = vt + vc - 2 * cov;
        const wTarget = denom !== 0 ? Math.max(0, Math.min(1, (vc - cov) / denom)) : 0;
        const wCandidate = 1 - wTarget;
        const portReturn = wTarget * means[targetFund] + wCandidate * means[fund];
        const portVar = (wTarget ** 2) * vt + (wCandidate ** 2) * vc + 2 * wTarget * wCandidate * cov;
        const portRisk = Math.sqrt(portVar);
        const sharpe = portRisk !== 0 ? portReturn / portRisk : 0;
        return { candidateFund: fund, weightTarget: wTarget, weightCandidate: wCandidate, portfolioReturn: portReturn, portfolioRisk: portRisk, sharpe };
      });

    results.sort((a, b) => b.sharpe - a.sharpe);
    const best = results[0];

    // 効率的フロンティア計算
    const frontier = computeEfficientFrontier(
      targetFund, best.candidateFund,
      means, variances, covMatrix
    );

    // HTML出力
    resultTextDiv.innerHTML = `
      <p><strong>ターゲットファンド:</strong> ${targetFund}</p>
      <p><strong>最適候補:</strong> ${best.candidateFund}</p>
      <p>${targetFund} 保有比率: ${(best.weightTarget * 100).toFixed(2)}%</p>
      <p>${best.candidateFund} 保有比率: ${(best.weightCandidate * 100).toFixed(2)}%</p>
      <p>期待リターン: ${best.portfolioReturn.toFixed(4)}</p>
      <p>リスク（標準偏差）: ${best.portfolioRisk.toFixed(4)}</p>
      <p>シャープレシオ: ${best.sharpe.toFixed(4)}</p>
      <h3>効率的フロンティア結果</h3>
      <p>最大シャープレシオ点:</p>
      <p>${targetFund} 保有比率: ${(frontier.optimalWeightTarget * 100).toFixed(2)}%</p>
      <p>${best.candidateFund} 保有比率: ${(frontier.optimalWeightCandidate * 100).toFixed(2)}%</p>
      <p>期待リターン: ${frontier.optimalReturn.toFixed(4)}</p>
      <p>リスク: ${frontier.optimalRisk.toFixed(4)}</p>
    `;

    // グラフ描画
    const traceFrontier = {
      x: frontier.risks,
      y: frontier.returns,
      mode: 'lines',
      name: 'Efficient Frontier'
    };

    const traceOptimal = {
      x: [frontier.optimalRisk],
      y: [frontier.optimalReturn],
      mode: 'markers',
      marker: { color: 'red', size: 10 },
      name: 'Max Sharpe Ratio Point'
    };

    Plotly.newPlot(chartDiv, [traceFrontier, traceOptimal], {
      title: '2ファンド組み合わせの効率的フロンティア',
      xaxis: { title: 'リスク（標準偏差）' },
      yaxis: { title: '期待リターン' }
    });
  });

  // ---------- 効率的フロンティア計算 ----------
  function computeEfficientFrontier(fundA, fundB, means, variances, covMatrix) {
    const muA = means[fundA], muB = means[fundB];
    const varA = variances[fundA], varB = variances[fundB];
    const cov = covMatrix[fundA][fundB];

    const n = 100;
    const weights = [], returns = [], risks = [], sharpes = [];

    for (let i = 0; i < n; i++) {
      const w = i / (n - 1);
      weights.push(w);
      const r = w * muA + (1 - w) * muB;
      returns.push(r);
      const v = (w ** 2) * varA + ((1 - w) ** 2) * varB + 2 * w * (1 - w) * cov;
      const risk = Math.sqrt(v);
      risks.push(risk);
      sharpes.push(risk !== 0 ? r / risk : 0);
    }

    const maxSharpeIdx = sharpes.indexOf(Math.max(...sharpes));
    return {
      weights,
      returns,
      risks,
      sharpes,
      optimalWeightTarget: weights[maxSharpeIdx],
      optimalWeightCandidate: 1 - weights[maxSharpeIdx],
      optimalReturn: returns[maxSharpeIdx],
      optimalRisk: risks[maxSharpeIdx]
    };
  }
});
