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
        csvData = results.data.filter(row => Object.keys(row).length > 1);
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

  // 平均, 分散, 共分散の計算ユーティリティ関数
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
    
    // ターゲットファンドの選択確認
    let targetFund = targetFundSelect.value;
    if (!targetFund) {
      alert("ターゲットファンドを選択してください。");
      return;
    }
    
    // 現在の保有額と追加投資額の入力を取得
    let currentHolding = parseFloat(document.getElementById("currentHolding").value);
    let extraFunds = parseFloat(document.getElementById("extraFunds").value);
    if(isNaN(currentHolding) || isNaN(extraFunds)) {
      alert("現在の保有額または追加投資額を正しく入力してください。");
      return;
    }
    
    // 各ファンドのデータ（数値配列）を抽出
    let fundData = {};
    funds.forEach(fund => {
      fundData[fund] = csvData.map(row => parseFloat(row[fund])).filter(val => !isNaN(val));
    });

    // 各ファンドの平均と分散を計算
    let means = {};
    let variances = {};
    funds.forEach(fund => {
      let dataArr = fundData[fund];
      let mean = computeMean(dataArr);
      means[fund] = mean;
      variances[fund] = computeVariance(dataArr, mean);
    });

    // 共分散行列の作成
    let covMatrix = {};
    funds.forEach(fund1 => {
      covMatrix[fund1] = {};
      funds.forEach(fund2 => {
        covMatrix[fund1][fund2] = computeCovariance(fundData[fund1], means[fund1], fundData[fund2], means[fund2]);
      });
    });

    // ターゲットファンドと各候補ファンドとの組み合わせごとの統計指標を算出
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
    
    // シャープレシオの高い順にソートし、最適な候補ファンドを選択
    results.sort((a, b) => b.sharpe - a.sharpe);
    let bestCandidateResult = results[0];
    let bestCandidate = bestCandidateResult.candidateFund;
    
    // ここでhistorical optimal weight（最適割合）を利用
    let optimalWeightTarget = bestCandidateResult.weightTarget;
    
    // 追加投資を含む全体のポートフォリオを考える
    // 現在のターゲットファンドの保有額 currentHolding と、追加投資額 extraFunds を合わせた総額
    let totalPortfolio = currentHolding + extraFunds;
    // 理想的な新規投資時のターゲットファンドの保有割合は optimalWeightTarget
    // そのため、ターゲットファンドの最終的な保有額が totalPortfolio * optimalWeightTarget になるように調整するには：
    let additionalTarget = optimalWeightTarget * totalPortfolio - currentHolding;
    // もし additionalTarget がマイナスなら（すでに過剰保有している場合）は、追加投資は候補ファンドのみ
    if(additionalTarget < 0) additionalTarget = 0;
    let additionalCandidate = extraFunds - additionalTarget;
    
    // 結果の表示用HTMLを組み立てる
    let resultHTML = `<p>ターゲットファンド: <strong>${targetFund}</strong></p>`;
    resultHTML += `<p>最も効率的な組み合わせ候補: <strong>${bestCandidate}</strong></p>`;
    resultHTML += `<p>歴史的データに基づく最適比率 (ターゲット): ${(optimalWeightTarget * 100).toFixed(2)}%</p>`;
    resultHTML += `<h3>追加投資の提案</h3>`;
    resultHTML += `<p>現在の${targetFund}の保有額: ${currentHolding.toLocaleString()}円</p>`;
    resultHTML += `<p>追加投資額: ${extraFunds.toLocaleString()}円</p>`;
    resultHTML += `<p>${targetFund} に追加投資する提案額: ${additionalTarget.toFixed(0)}円</p>`;
    resultHTML += `<p>${bestCandidate} に追加投資する提案額: ${additionalCandidate.toFixed(0)}円</p>`;
    
    // さらに、既存のポートフォリオ（新規投資後）の期待リターン，リスク，シャープレシオの概算値も表示
    let finalTargetValue = currentHolding + additionalTarget;
    let finalCandidateValue = additionalCandidate; // 現在候補ファンドは未保有と仮定
    let finalTotal = finalTargetValue + finalCandidateValue;
    let finalWeightTarget = finalTargetValue / finalTotal;
    let finalWeightCandidate = finalCandidateValue / finalTotal;
    // シンプルに重み付き平均で新たな期待リターンを算出（実際は分散計算が必要ですが、ここでは参考値）
    let finalReturn = finalWeightTarget * means[targetFund] + finalWeightCandidate * means[bestCandidate];
    let finalRisk = finalWeightTarget * Math.sqrt(variances[targetFund]) + finalWeightCandidate * Math.sqrt(variances[bestCandidate]);
    resultHTML += `<h3>新ポートフォリオ概算</h3>`;
    resultHTML += `<p>ターゲットファンド比率: ${(finalWeightTarget * 100).toFixed(2)}%、${bestCandidate}比率: ${(finalWeightCandidate * 100).toFixed(2)}%</p>`;
    resultHTML += `<p>期待リターン (概算): ${finalReturn.toFixed(4)}</p>`;
    resultHTML += `<p>リスク (概算): ${finalRisk.toFixed(4)}</p>`;
    
    resultTextDiv.innerHTML = resultHTML;
    
    // グラフ描画 (historicalな効率的フロンティアをシンプルに表示)
    let traceFrontier = {
      x: results.map(r => r.portfolioRisk),
      y: results.map(r => r.portfolioReturn),
      mode: 'lines',
      name: 'Efficient Frontier'
    };

    let traceOptimal = {
      x: [bestCandidateResult.portfolioRisk],
      y: [bestCandidateResult.portfolioReturn],
      mode: 'markers',
      marker: { color: 'red', size: 10 },
      name: 'Max Sharpe Ratio Point'
    };

    let layout = {
      title: '2ファンド組み合わせの効率的フロンティア',
      xaxis: { title: 'リスク（標準偏差）' },
      yaxis: { title: '期待リターン' }
    };

    Plotly.newPlot(chartDiv, [traceFrontier, traceOptimal], layout);
  });
});
