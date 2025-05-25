document.addEventListener("DOMContentLoaded", function() {
  let csvData = null;
  let funds = [];

  // DOM要素の取得
  const csvFileInput = document.getElementById("csvFileInput");
  const targetFundSelect = document.getElementById("targetFundSelect");
  const calcButton = document.getElementById("calcButton");
  const resultTextDiv = document.getElementById("resultText");
  const chartDiv = document.getElementById("frontierChart");

  // ファイルアップロード時の処理（CSV または Excel対応）
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

  // CSVファイル処理（PapaParseを利用）
  function processCSV(file) {
    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      complete: function(results) {
        // 空行を除外
        csvData = results.data.filter(row => Object.keys(row).length > 1);
        // ヘッダー(ファンド名)：Date列以外
        funds = Object.keys(csvData[0]).filter(key => key !== "Date");
        updateTargetFundSelect();
      },
      error: function(error) {
        console.error("CSVパースエラー:", error);
      }
    });
  }

  // Excelファイル処理（SheetJSを利用）
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

  // ターゲットファンドプルダウンの更新
  function updateTargetFundSelect() {
    targetFundSelect.innerHTML = "";
    funds.forEach(fund => {
      let option = document.createElement("option");
      option.value = fund;
      option.textContent = fund;
      targetFundSelect.appendChild(option);
    });
  }

  // 統計量計算用ユーティリティ
  function computeMean(arr) {
    return arr.reduce((sum, val) => sum + val, 0) / arr.length;
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
    
    // ユーザー入力（現在の保有額・追加投資額）の取得
    let currentHolding = parseFloat(document.getElementById("currentHolding").value);
    let extraFunds = parseFloat(document.getElementById("extraFunds").value);
    if (isNaN(currentHolding) || isNaN(extraFunds)) {
      alert("現在の保有額または追加投資額を正しく入力してください。");
      return;
    }
    
    // 各ファンドのデータを数値配列に変換
    let fundData = {};
    funds.forEach(fund => {
      fundData[fund] = csvData.map(row => parseFloat(row[fund])).filter(val => !isNaN(val));
    });
    
    // 各ファンドの平均・分散の計算
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
    
    // ターゲットファンドと候補ファンドの組み合わせを評価し、統計指標を算出
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
    
    // 最大シャープレシオの候補でソートし、最適な候補ファンドを選択
    results.sort((a, b) => b.sharpe - a.sharpe);
    let bestCandidateResult = results[0];
    let bestCandidate = bestCandidateResult.candidateFund;
    let optimalWeightTarget = bestCandidateResult.weightTarget; // 歴史的理想比率の目安
    
    // 現状のポートフォリオ（ターゲットファンドのみ保有、100%）
    let currentPortfolioReturn = means[targetFund];
    let currentPortfolioRisk = Math.sqrt(variances[targetFund]);
    let currentPortfolioSharpe = currentPortfolioRisk !== 0 ? currentPortfolioReturn / currentPortfolioRisk : NaN;
    
    // 投資後の計算：総投資額 = 現状＋追加投資
    let totalPortfolio = currentHolding + extraFunds;
    // 理想のターゲットファンド最終保有額 = 総投資額 × optimalWeightTarget
    let idealTargetValue = totalPortfolio * optimalWeightTarget;
    let additionalTarget = idealTargetValue - currentHolding;
    if (additionalTarget < 0) additionalTarget = 0;
    let additionalCandidate = extraFunds - additionalTarget;
    
    // 新規投資後のポートフォリオ (概算)
    let finalTargetValue = currentHolding + additionalTarget;
    let finalCandidateValue = additionalCandidate;
    let finalTotal = finalTargetValue + finalCandidateValue;
    let finalWeightTarget = finalTotal > 0 ? finalTargetValue / finalTotal : 0;
    let finalWeightCandidate = finalTotal > 0 ? finalCandidateValue / finalTotal : 0;
    let newPortfolioReturn = finalWeightTarget * means[targetFund] + finalWeightCandidate * means[bestCandidate];
    let newPortfolioRisk = finalWeightTarget * Math.sqrt(variances[targetFund]) + finalWeightCandidate * Math.sqrt(variances[bestCandidate]);
    let newPortfolioSharpe = newPortfolioRisk !== 0 ? newPortfolioReturn / newPortfolioRisk : NaN;
    
    // 結果のHTML組み立て
    let resultHTML = `<p>【ターゲットファンド】 <strong>${targetFund}</strong></p>`;
    resultHTML += `<p>【最適な候補ファンド】 <strong>${bestCandidate}</strong></p>`;
    resultHTML += `<p>理想比率 (ターゲット): ${(optimalWeightTarget * 100).toFixed(2)}%</p>`;
    
    resultHTML += `<h3>現状のポートフォリオ</h3>`;
    resultHTML += `<p>${targetFund} 保有額: ${currentHolding.toLocaleString()}円 (100%対象ファンド)</p>`;
    resultHTML += `<p>期待リターン: ${currentPortfolioReturn.toFixed(4)}</p>`;
    resultHTML += `<p>リスク: ${currentPortfolioRisk.toFixed(4)}</p>`;
    resultHTML += `<p>シャープレシオ: ${currentPortfolioSharpe.toFixed(4)}</p>`;
    
    resultHTML += `<h3>追加投資の提案</h3>`;
    resultHTML += `<p>追加投資額: ${extraFunds.toLocaleString()}円</p>`;
    resultHTML += `<p>${targetFund} への追加投資提案額: ${additionalTarget.toFixed(0)}円</p>`;
    resultHTML += `<p>${bestCandidate} への追加投資提案額: ${additionalCandidate.toFixed(0)}円</p>`;
    
    resultHTML += `<h3>新規投資後のポートフォリオ (概算)</h3>`;
    resultHTML += `<p>割合: ${ (finalWeightTarget*100).toFixed(2)}% (${targetFund}), ${ (finalWeightCandidate*100).toFixed(2)}% (${bestCandidate})</p>`;
    resultHTML += `<p>期待リターン (概算): ${newPortfolioReturn.toFixed(4)}</p>`;
    resultHTML += `<p>リスク (概算): ${newPortfolioRisk.toFixed(4)}</p>`;
    resultHTML += `<p>シャープレシオ (概算): ${newPortfolioSharpe.toFixed(4)}</p>`;
    
    resultTextDiv.innerHTML = resultHTML;
    
    // グラフ描画：historicalな効率的フロンティアと各ポートフォリオの点

 // --- グラフ描画部の修正 ---
    // まず、選択されたペア（targetFund と bestCandidate）の純粋な効率的フロンティアを計算（予算制約無視）
    let numPoints = 100;
    let frontierRisks = [];
    let frontierReturns = [];
    for (let i = 0; i <= numPoints; i++) {
      let w = i / numPoints; // 重み（ターゲットファンドの割合）
      let ret = w * means[targetFund] + (1 - w) * means[bestCandidate];
      let variance = (w ** 2) * variances[targetFund] 
                   + ((1 - w) ** 2) * variances[bestCandidate]
                   + 2 * w * (1 - w) * covMatrix[targetFund][bestCandidate];
      let risk = Math.sqrt(variance);
      frontierRisks.push(risk);
      frontierReturns.push(ret);
    }

    
// 青い線として描く純粋な効率的フロンティア
    let tracePureFrontier = {
      x: frontierRisks,
      y: frontierReturns,
      mode: 'lines',
      name: 'Pure Efficient Frontier',
      line: { color: 'blue', width: 2 }
    };

    
    let traceFrontier = {
      x: results.map(r => r.portfolioRisk),
      y: results.map(r => r.portfolioReturn),
      mode: 'lines',
      name: 'Efficient Frontier',
      line: { color:'#888', width: 2 }
    };
    let traceOptimal = {
      x: [bestCandidateResult.portfolioRisk],
      y: [bestCandidateResult.portfolioReturn],
      mode: 'markers',
      marker: { color: 'red', size: 10 },
      name: 'Max Sharpe Ratio'
    };
   
    let traceNew = {
      x: [newPortfolioRisk],
      y: [newPortfolioReturn],
      mode: 'markers',
      marker: { color: 'green', size: 10 },
      name: 'New Portfolio'
    };
    
    let layout = {
      title: '2ファンド組み合わせの効率的フロンティア',
      xaxis: {
        title: 'リスク（標準偏差）',
        zeroline: false,
        gridcolor: '#f0f0f0',
        tickformat: ".2f"
      },
      yaxis: {
        title: '期待リターン',
        zeroline: false,
        gridcolor: '#f0f0f0',
        tickformat: ".2f"
      },
      legend: {
        orientation: 'h',
        x: 0.3,
        y: -0.2
      },
      margin: { top: 60, bottom: 80, left: 70, right: 50 },
      paper_bgcolor: '#fff',
      plot_bgcolor: '#fff'
    };
    
    Plotly.newPlot(chartDiv, [traceFrontier, traceOptimal, traceCurrent, traceNew], layout, {responsive: true});
  });
});
