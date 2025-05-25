<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ファンド効率的フロンティア計算プログラム</title>
  <link rel="stylesheet" href="styles.css">
  <!-- Plotly, PapaParse, SheetJS の CDN -->
  <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/papaparse@5.3.2/papaparse.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
</head>
<body>
  <header>
    <h1>ファンド効率的フロンティア計算プログラム</h1>
  </header>
  <main>
    <section id="instructions">
      <p>
        仮データ CSV または Excel ファイル（.xlsx）をアップロードしてください。<br>
        ファイルは 1 列目に「Date」列、その後に各ファンドの月次リターン（例:"AYD", "GLB" など）が含まれている形式です。
      </p>
    </section>
    <section id="upload-section">
      <input type="file" id="csvFileInput" accept=".csv,.xlsx">
    </section>
    <section id="target-section">
      <label for="targetFundSelect">ターゲットファンド:</label>
      <select id="targetFundSelect">
        <option value="">--ファイルをアップロードしてください--</option>
      </select>
    </section>
    <section id="investment-section">
      <label for="currentHolding">現在の保有額 (円):</label>
      <input type="number" id="currentHolding" placeholder="例: 1000000">
      <br>
      <label for="extraFunds">追加投資額 (円):</label>
      <input type="number" id="extraFunds" placeholder="例: 500000">
    </section>
    <section id="calc-section">
      <button id="calcButton">計算開始</button>
    </section>
    <section id="results">
      <h2>計算結果</h2>
      <div id="resultText"></div>
    </section>
    <section id="chart">
      <h2>効率的フロンティア</h2>
      <div id="frontierChart"></div>
    </section>
  </main>
  <script src="script.js"></script>
</body>
</html>
