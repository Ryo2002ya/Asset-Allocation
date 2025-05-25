<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>効率的フロンティア</title>
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
        ファイルは 1 列目に「Date」列、その後に各ファンドの月次リターンが含まれる形式です。
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
  
  <!-- math.js を先に読み込む -->
  <script src="math.js"></script>
  <!-- メインロジック -->
  <script src="script.js"></script>
</body>
</html>
