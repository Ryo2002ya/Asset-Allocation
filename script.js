document.addEventListener("DOMContentLoaded", function() {  
  let csvData = null;
  let funds = [];
  const calcButton = document.getElementById("calcButton");
  const resultTextDiv = document.getElementById("resultText");
  const chartDiv = document.getElementById("frontierChart");

  function computeMean(arr) {
    return arr.reduce((sum, val) => sum + val, 0) / arr.length;
  }

  function computeVariance(arr, mean) {
    return arr.reduce((acc, val) => acc + (val - mean) ** 2, 0) / arr.length;
  }

  function computeCovariance(arr1, mean1, arr2, mean2) {
    return arr1.reduce((sum, val, i) => sum + (val - mean1) * (arr2[i] - mean2), 0) / arr1.length;
  }

  function loadCSV() {
    fetch("C:/Users/ryoya/Downloads/仕事/仮データ.csv")
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

    let means = {};
    let variances = {};
    funds.forEach(fund => {
      let dataArr = fundData[fund];
      let mean = computeMean(dataArr);
      means[fund] = mean;
      variances[fund] = computeVariance(dataArr, mean);
    });

    let results = funds.map(fund => {
      if (fund === targetFund) return null;

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
      let sharpe = (portRisk !== 0) ? portReturn / portRisk : NaN;

      return {
        candidateFund: fund,
        portfolioRisk: portRisk,
        portfolioReturn: portReturn,
        sharpe: sharpe
      };
    }).filter(r => r !== null && !isNaN(r.portfolioRisk) && !isNaN(r.portfolioReturn));

    console.log(results);

    if (results.length === 0) {
      alert("有効なポートフォリオデータが取得できませんでした。");
      return;
    }

    let traceFrontier = {
      x: results.map(r => r.portfolioRisk),
      y: results.map(r => r.portfolioReturn),
      mode: "lines",
      name: "Efficient Frontier",
      line: { color: "#888", width: 2 }
    };

    if (!chartDiv) {
      console.error("chartDiv が取得できませんでした。");
      return;
    }

    Plotly.newPlot(chartDiv, [traceFrontier], {
      title: "2ファンド組み合わせの効率的フロンティア",
      xaxis: { title: "リスク（標準偏差）", tickformat: ".2f" },
      yaxis: { title: "期待リターン", tickformat: ".2f" }
    });

    console.log("グラフ描画完了！");
  });
});
