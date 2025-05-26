document.addEventListener("DOMContentLoaded", function() {  

  const calcButton = document.getElementById("calcButton");
  const resultTextDiv = document.getElementById("resultText");
  const chartDiv = document.getElementById("frontierChart");
  const targetFundSelect = document.getElementById("targetFundSelect");
  
  let csvData = null;
  let funds = [];
  const calcButton = document.getElementById("calcButton");
  const resultTextDiv = document.getElementById("resultText");
  const chartDiv = document.getElementById("frontierChart");

  function computeMean(arr) {
    return arr.length ? arr.reduce((sum, val) => sum + val, 0) / arr.length : NaN;
  }

  function computeVariance(arr, mean) {
    return arr.length ? arr.reduce((acc, val) => acc + (val - mean) ** 2, 0) / arr.length : NaN;
  }

  function computeCovariance(arr1, mean1, arr2, mean2) {
    return arr1.length && arr2.length 
      ? arr1.reduce((sum, val, i) => sum + (val - mean1) * (arr2[i] - mean2), 0) / arr1.length 
      : NaN;
  }

  function loadCSV() {
    fetch("仮データ.csv") // Change this to a relative or uploaded path
      .then(response => response.text())
      .then(text => {
        csvData = Papa.parse(text, {
          header: true,
          dynamicTyping: true
        }).data;

        funds = Object.keys(csvData[0]).filter(key => key !== "Date");
      })
      .catch(error => console.error("CSV読み込みエラー:", error));
  }

  loadCSV(); // 自動でCSVを読み込む

  calcButton.addEventListener("click", function() {
    let targetFund = document.getElementById("targetFundSelect").value;
    if (!targetFund) {
      alert("ターゲットファンドを選択してください。");
      return;
    }

    let fundData = {};
    funds.forEach(fund => {
      fundData[fund] = csvData.map(row => parseFloat(row[fund])).filter(val => !isNaN(val));
    });

    let means = {}, variances = {};
    funds.forEach(fund => {
      let dataArr = fundData[fund];
      if (!dataArr.length) return;

      let mean = computeMean(dataArr);
      let variance = computeVariance(dataArr, mean);

      means[fund] = mean;
      variances[fund] = variance;
    });

    let results = funds.map(fund => {
      if (fund === targetFund || !means[fund] || !variances[fund]) return null;

      let sigmaTargetSq = variances[targetFund];
      let sigmaCandidateSq = variances[fund];
      let covTargetCandidate = computeCovariance(fundData[targetFund], means[targetFund], fundData[fund], means[fund]);

      let denominator = sigmaTargetSq + sigmaCandidateSq - 2 * covTargetCandidate;
      let wTarget = (denominator !== 0) ? (sigmaCandidateSq - covTargetCandidate) / denominator : 0;
      wTarget = Math.max(0, Math.min(1, wTarget));
      let wCandidate = 1 - wTarget;

      let portReturn = wTarget * means[targetFund] + wCandidate * means[fund];
      let portVariance = (wTarget ** 2) * sigmaTargetSq + (wCandidate ** 2) * sigmaCandidateSq + 2 * wTarget * wCandidate * covTargetCandidate;
      let portRisk = Math.sqrt(portVariance);
      let sharpe = (portRisk !== 0) ? portReturn / portRisk : null;

      return (!isNaN(portRisk) && !isNaN(portReturn)) ? {
        candidateFund: fund,
        portfolioRisk: portRisk,
        portfolioReturn: portReturn,
        sharpe: sharpe
      } : null;
    }).filter(r => r !== null);

    if (results.length === 0) {
      alert("有効なポートフォリオデータが取得できませんでした。");
      return;
    }

    if (!chartDiv) {
      console.error("chartDiv が取得できませんでした。");
      return;
    }

    let traceFrontier = {
      x: results.map(r => r.portfolioRisk),
      y: results.map(r => r.portfolioReturn),
      mode: "lines",
      name: "Efficient Frontier",
      line: { color: "#888", width: 2 }
    };

    Plotly.newPlot(chartDiv, [traceFrontier], {
      title: "2ファンド組み合わせの効率的フロンティア",
      xaxis: { title: "リスク（標準偏差）", tickformat: ".2f" },
      yaxis: { title: "期待リターン", tickformat: ".2f" }
    });

    console.log("グラフ描画完了！");
  });
});
