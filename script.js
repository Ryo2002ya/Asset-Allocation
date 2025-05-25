document.addEventListener("DOMContentLoaded", function () {
  let csvData = null;
  let funds = [];

  const csvFileInput = document.getElementById("csvFileInput");
  const targetFundSelect = document.getElementById("targetFundSelect");
  const calcButton = document.getElementById("calcButton");
  const resultTextDiv = document.getElementById("resultText");
  const chartDiv = document.getElementById("frontierChart");

  // 拡張子でファイルタイプを判別し、パース処理を分ける
  csvFileInput.addEventListener("change", function (evt) {
    const file = evt.target.files[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    if (fileName.endsWith(".csv")) {
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        complete: function (results) {
          csvData = results.data.filter(row => Object.keys(row).length > 1);
          initializeFundList(csvData);
        },
        error: function (error) {
          console.error("CSVパースエラー:", error);
        }
      });
    } else if (fileName.endsWith(".xlsx")) {
      const reader = new FileReader();
      reader.onload = function (e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: null });
        csvData = json.filter(row => Object.keys(row).length > 1);
        initializeFundList(csvData);
      };
      reader.readAsArrayBuffer(file);
    } else {
      alert("対応しているファイル形式は .csv および .xlsx のみです。");
    }
  });

  function initializeFundList(data) {
    funds = Object.keys(data[0]).filter(key => key !== "Date");
    targetFundSelect.innerHTML = "";
    funds.forEach(fund => {
      let option = document.createElement("option");
      option.value = fund;
      option.textContent = fund;
      targetFundSelect.appendChild(option);
    });
  }

  function computeMean(arr) {
    let sum = arr.reduce((a, b) => a + b, 0);
    return sum / arr.length;
  }

  function computeVariance(arr, mean) {
    let sum = arr.reduce((acc, val) => acc + (val - mean) ** 2, 0);
    return sum / arr.length;
  }

  function computeCovariance(arr1, mean1, arr2, mean2) {
    let sum = 0;
    for (let i = 0; i < arr1.length; i++) {
      sum += (arr1[i] - mean1) * (arr2[i] - mean2);
    }
    return sum / arr1.length;
  }

  calcButton.addEventListener("click", function () {
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
      let m = computeMean(dataArr);
      means[fund] = m;
      variances[fund] = computeVariance(dataArr, m);
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

      results.push({
        candidateFund: fund,
        weightTarget: wTarget,
        weightCandidate: wCandidate,
        portfolioReturn: portReturn,
        portfolioRisk: portRisk,
        sharpe: sharpe
      });
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

    // フロンティア描画
    let muTarget = means[targetFund];
    let muCandidate = means[bestCandidate];
    let sigmaTargetSq = variances[targetFund];
    let sigmaCandidateSq = variances[bestCandidate];
    let covTargetCandidate = covMatrix[targetFund][bestCandidate];

    let numPoints = 100;
    let frontierWeights = [];
    let frontierReturns = [];
    let frontierRisks = [];
    let frontierSharpes = [];
    for (let i = 0; i < numPoints; i++) {
      let w = i / (numPoints - 1);
      frontierWeights.push(w);
      let ret = w * muTarget + (1 - w) * muCandidate;
      frontierReturns.push(ret);
      let varPort = (w ** 2) * sigmaTargetSq + ((1 - w) ** 2) * sigmaCandidateSq + 2 * w * (1 - w) * covTargetCandidate;
      let risk = Math.sqrt(varPort);
      frontierRisks.push(risk);
      frontierSharpes.push(risk !== 0 ? ret / risk : 0);
    }

    let maxSharpeIdx = frontierSharpes.indexOf(Math.max(...frontierSharpes));
    let optimalWeightTarget = frontierWeights[maxSharpeIdx];
    let optimalWeightCandidate = 1 - optimalWeightTarget;
    let optimalReturn = frontierReturns[maxSharpeIdx];
    let optimalRisk = frontierRisks[maxSharpeIdx];

    resultHTML += `<h3>効率的フロンティア結果</h3>`;
    resultHTML += `<p>最大シャープレシオとなる点:</p>`;
    resultHTML += `<p>${targetFund} の保有比率: ${(optimalWeightTarget * 100).toFixed(2)}%</p>`;
    resultHTML += `<p>${bestCandidate} の保有比率: ${(optimalWeightCandidate * 100).toFixed(2)}%</p>`;
    resultHTML += `<p>期待リターン: ${optimalReturn.toFixed(4)}</p>`;
    resultHTML += `<p>リスク: ${optimalRisk.toFixed(4)}</p>`;
    resultTextDiv.innerHTML = resultHTML;

    let traceFrontier = {
      x: frontierRisks,
      y: frontierReturns,
      mode: "lines",
      name: "Efficient Frontier"
    };

    let traceOptimal = {
      x: [optimalRisk],
      y: [optimalReturn],
      mode: "markers",
      marker: { color: "red", size: 10 },
      name: "Max Sharpe Ratio Point"
    };

    let layout = {
      title: "2ファンド組み合わせの効率的フロンティア",
      xaxis: { title: "リスク（標準偏差）" },
      yaxis: { title: "期待リターン" }
    };

    Plotly.newPlot(chartDiv, [traceFrontier, traceOptimal], layout);
  });
});
