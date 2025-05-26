<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>効率的フロンティア計算</title>
  <link rel="stylesheet" href="styles.css">
  <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
</head>
<body>
  <header>
    <h1>効率的フロンティア</h1>
  </header>
  
  <main>
    <section id="instructions">
      <p>ファンドを選択してください。</p>
    </section>

    <section id="target-section">
      <label for="targetFundSelect">ターゲットファンド:</label>
      <select id="targetFundSelect">
        <option value="">--ファンドを選択--</option>
        <option value="AYD">AYD</option>
        <option value="GLB">GLB</option>
        <option value="TKN">TKN</option>
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

<script src="https://cdn.plot.ly/plotly-2.32.0.min.js"></script>
</body>
</html>
