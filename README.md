<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>効率的フロンティア計算</title>
  <link rel="stylesheet" href="styles.css">
  <!-- Plotly, PapaParse, SheetJS の CDN -->
  https://cdn.plot.ly/plotly-latest.min.js
  https://cdn.jsdelivr.net/npm/papaparse@5.3.2/papaparse.min.js
  <script src="https://cdnjs.cloudflare.com/ajax18.5/xlsx.full.min.js
</head>
<body>
  <header>
    <h1>効率的フロンティア</h1>
  </header>
  <main>
    <!-- ファイルアップロード -->
    <section id="upload-section">
      <input type="file" id="csvFileInput" accept=".csv,.xlsx">
    </section>
    <!-- ターゲットファンド選択 -->
    <section id="target-section">
      <label for="targetFundSelect">ターゲットファンド:</label>
      <select id="targetFundSelect">
        <option value="">--ファイルをアップロードしてください--</option>
      </select>
    </section>
    <!-- 現在の保有額と追加投資額 -->
    <section id="investment-section">
      <label for="currentHolding">現在の保有額 (円):</label>
      <input type="number" id="currentHolding" placeholder="例: 1000000">
      <br>
      <label for="extraFunds">追加投資額 (円):</label>
      <input type="number" id="extraFunds" placeholder="例: 500000">
    </section>
    <!-- 計算開始ボタン -->
    <section id="calc-section">
      <button id="calcButton">計算開始</button>
    </section>
    <!-- 結果表示エリア -->
    <section id="results">
      <h2>計算結果</h2>
      <div id="resultText"></div>
    </section>
    <!-- グラフ表示エリア -->
    <section id="chart">
      <h2>効率的フロンティア</h2>
      <div id="frontierChart"></div>
    </section>
  </main>
  <script src="script.js"></script>
</body>
</html>
