// scripts/fetch-data.mjs
// Yahoo Finance / CNN / NAAIM から1日1回データを取得し、
// public/data/*.json に書き出す。GitHub Actions から実行される。

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as XLSX from 'xlsx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '..', 'public', 'data');

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- 株価データ取得 ----------
// 各ターゲットに複数のデータソースを優先順位付きで持たせ、
// 順次トライしてフォールバックする方式。
//
// データソースの種類:
//   - fred:<series>  FRED CSV (無料・無認証・極めて安定。Close のみ)
//   - td:<symbol>    Twelve Data (要 API キー、無料枠は US ETF のみ)
//   - yahoo:<symbol> Yahoo Finance v8 (CIだと 429 になりがち。最終フォールバック)
const TD_KEY = process.env.TWELVEDATA_API_KEY;

const QUOTE_TARGETS = [
  // ---- センチメント (指数) ----
  // VIX: CBOE 公式 CSV が一番安定。FRED と Yahoo を後段に。
  { id: 'vix',  label: 'VIX',  sources: ['cboe:VIX', 'fred:VIXCLS', 'yahoo:^VIX'] },

  // ---- 指数代理 / セクター ETF ----
  { id: 'qqq',  label: 'QQQ',  sources: ['td:QQQ',  'yahoo:QQQ']  },
  { id: 'soxx', label: 'SOXX', sources: ['td:SOXX', 'yahoo:SOXX'] },
  { id: 'xlk',  label: 'XLK',  sources: ['td:XLK',  'yahoo:XLK']  },

  // ---- 3x レバレッジ ETF ----
  { id: 'tqqq', label: 'TQQQ', sources: ['td:TQQQ', 'yahoo:TQQQ'] },
  { id: 'soxl', label: 'SOXL', sources: ['td:SOXL', 'yahoo:SOXL'] },
  { id: 'tecl', label: 'TECL', sources: ['td:TECL', 'yahoo:TECL'] },
];

async function fetchFromSource(source) {
  const idx = source.indexOf(':');
  const kind = source.slice(0, idx);
  const sym = source.slice(idx + 1);
  if (kind === 'td')    return fetchTwelveDataSymbol(sym, sym);
  if (kind === 'yahoo') return fetchYahooSymbol(sym);
  if (kind === 'fred')  return fetchFredSeries(sym);
  if (kind === 'cboe')  return fetchCboeVixHistory();
  throw new Error(`unknown source: ${source}`);
}

// CBOE 公式の VIX 過去データ CSV (CDN 配信、無料・無認証)
async function fetchCboeVixHistory() {
  const url =
    'https://cdn.cboe.com/api/global/us_indices/daily_prices/VIX_History.csv';
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'text/csv,*/*;q=0.5' },
  });
  if (!res.ok) throw new Error(`CBOE HTTP ${res.status}`);
  const csv = (await res.text()).trim();
  const lines = csv.split(/\r?\n/);
  if (lines.length < 100) throw new Error('CBOE VIX: too few lines');

  // CSV: DATE,OPEN,HIGH,LOW,CLOSE
  const candles = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(',');
    if (cells.length < 5) continue;
    const t = new Date(cells[0]).getTime();
    const o = Number(cells[1]);
    const h = Number(cells[2]);
    const l = Number(cells[3]);
    const c = Number(cells[4]);
    if (!Number.isFinite(t) || !Number.isFinite(c)) continue;
    candles.push({ t, o, h, l, c });
  }
  if (candles.length < 60) throw new Error('CBOE VIX: parse failed');

  // 直近 ~14ヶ月分に絞る
  const cutoff = Date.now() - 430 * 24 * 60 * 60 * 1000;
  const recent = candles.filter((c) => c.t >= cutoff);
  return { symbol: 'VIX', candles: recent.length >= 60 ? recent : candles };
}

// FRED は CSV (Date,Value) を返す。Close のみだが summarizeCandles は h/l 欠落でも動く。
async function fetchFredSeries(seriesId) {
  const urls = [
    `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${encodeURIComponent(seriesId)}`,
    `https://fred.stlouisfed.org/series/${encodeURIComponent(seriesId)}/downloaddata/${encodeURIComponent(seriesId)}.csv`,
  ];
  let lastErr = null;
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, Accept: 'text/csv,*/*;q=0.5' },
        redirect: 'follow',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const csv = (await res.text()).trim();
      return parseFredCsv(seriesId, csv);
    } catch (e) {
      const cause = e?.cause?.code ? ` (${e.cause.code})` : '';
      lastErr = new Error(`${e.message}${cause}`);
    }
  }
  throw new Error(`FRED ${seriesId}: ${lastErr?.message ?? 'unknown'}`);
}

function parseFredCsv(seriesId, csv) {
  const lines = csv.split(/\r?\n/);
  if (lines.length < 30) throw new Error(`FRED ${seriesId}: too few lines`);
  const candles = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(',');
    if (cells.length < 2) continue;
    const date = cells[0]?.trim();
    const val = cells[1]?.trim();
    if (!date || !val || val === '.') continue; // FRED は欠損を '.' で表す
    const t = new Date(date).getTime();
    const c = Number(val);
    if (!Number.isFinite(t) || !Number.isFinite(c)) continue;
    candles.push({ t, o: null, h: null, l: null, c });
  }
  if (candles.length < 30) throw new Error(`FRED ${seriesId}: too few valid rows`);
  return { symbol: seriesId, candles };
}

async function fetchTwelveDataSymbol(symbol, tdSym) {
  if (!TD_KEY) throw new Error('TWELVEDATA_API_KEY not set');
  const url =
    `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(tdSym)}` +
    `&interval=1day&outputsize=300&apikey=${TD_KEY}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`TwelveData ${symbol} HTTP ${res.status}`);
  const json = await res.json();
  if (json.status === 'error' || json.code >= 400)
    throw new Error(`TwelveData ${symbol}: ${json.message ?? 'error'}`);
  const values = json.values ?? [];
  if (values.length < 2) throw new Error(`TwelveData ${symbol}: too few rows`);

  // values は最新が先頭。古い順に詰め直す。
  const candles = values
    .map((v) => ({
      t: new Date(v.datetime).getTime(),
      o: Number(v.open),
      h: Number(v.high),
      l: Number(v.low),
      c: Number(v.close),
    }))
    .filter((c) => Number.isFinite(c.c) && Number.isFinite(c.t))
    .sort((a, b) => a.t - b.t);

  if (candles.length < 2) throw new Error(`TwelveData ${symbol}: parse failed`);
  return { symbol, candles };
}

async function fetchYahooSymbol(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol,
  )}?range=14mo&interval=1d`;
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Yahoo ${symbol} HTTP ${res.status}`);
  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error(`Yahoo ${symbol}: empty result`);
  const ts = result.timestamp ?? [];
  const q = result.indicators?.quote?.[0] ?? {};
  const closeArr = q.close ?? [];

  const candles = ts
    .map((t, i) => ({
      t: t * 1000,
      o: q.open?.[i] ?? null,
      h: q.high?.[i] ?? null,
      l: q.low?.[i] ?? null,
      c: closeArr[i] ?? null,
    }))
    .filter((c) => c.c != null);

  if (candles.length < 2) throw new Error(`Yahoo ${symbol}: too few candles`);
  return { symbol, candles };
}


function summarizeCandles(symbol, candles) {
  const closes = candles.map((c) => c.c);
  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  const current = last.c;
  const prevClose = prev.c;

  // 日次変化
  const daily = {
    pctChange: ((current - prevClose) / prevClose) * 100,
    pointChange: current - prevClose,
  };

  // 週次変化 (ISO週でグループ化、各週末日終値の差)
  const weeks = groupByIsoWeek(candles);
  const weekKeys = Object.keys(weeks).sort();
  let weekly = null;
  if (weekKeys.length >= 2) {
    const lastWeekClose = weeks[weekKeys[weekKeys.length - 1]].at(-1).c;
    const prevWeekClose = weeks[weekKeys[weekKeys.length - 2]].at(-1).c;
    weekly = {
      pctChange: ((lastWeekClose - prevWeekClose) / prevWeekClose) * 100,
      pointChange: lastWeekClose - prevWeekClose,
    };
  }

  // レンジ計算 (カレンダー日数ベース)
  const now = last.t;
  const range = (days) => {
    const since = now - days * 24 * 60 * 60 * 1000;
    const slice = candles.filter((c) => c.t >= since);
    if (slice.length === 0) return null;
    return {
      high: Math.max(...slice.map((c) => c.h ?? c.c)),
      low: Math.min(...slice.map((c) => c.l ?? c.c)),
    };
  };

  return {
    symbol,
    current,
    prevClose,
    daily,
    weekly,
    range1m: range(30),
    range3m: range(90),
    range52w: {
      high: Math.max(...closes),
      low: Math.min(...closes),
    },
    asOf: new Date(last.t).toISOString(),
  };
}

function groupByIsoWeek(candles) {
  const out = {};
  for (const c of candles) {
    const d = new Date(c.t);
    const key = isoWeekKey(d);
    (out[key] ||= []).push(c);
  }
  return out;
}

function isoWeekKey(d) {
  // ISO 週 (月曜始まり)
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = (date.getUTCDay() + 6) % 7; // Mon=0..Sun=6
  date.setUTCDate(date.getUTCDate() - dayNum + 3); // Thursday in this ISO week
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week =
    1 +
    Math.round(
      ((date - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7,
    );
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

async function fetchQuotes() {
  const out = {};
  for (const target of QUOTE_TARGETS) {
    const errs = [];
    let summary = null;
    for (const src of target.sources) {
      try {
        const { candles } = await fetchFromSource(src);
        summary = summarizeCandles(target.label, candles);
        break;
      } catch (e) {
        errs.push(`${src}: ${e.message}`);
      }
    }
    if (summary) {
      out[target.id] = summary;
      console.log(
        `  ✓ ${target.id} (${target.label}) close=${summary.current.toFixed(2)}`,
      );
    } else {
      out[target.id] = { symbol: target.label, error: errs.join(' / ') };
      console.error(`  ✗ ${target.id} (${target.label}): ${errs.join(' / ')}`);
    }
    await sleep(350);
  }
  return out;
}

// ---------- CNN Fear & Greed ----------

async function fetchFearGreed() {
  // CNN は ?date=YYYY-MM-DD を受けるが、省略すると最新を返す
  const url = 'https://production.dataviz.cnn.io/index/fearandgreed/graphdata';
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`CNN HTTP ${res.status}`);
  const json = await res.json();
  const fg = json?.fear_and_greed;
  if (!fg) throw new Error('CNN: missing fear_and_greed');

  return {
    current: Number(fg.score),
    rating: fg.rating, // "Extreme Fear" | "Fear" | "Neutral" | "Greed" | "Extreme Greed"
    previousClose: Number(fg.previous_close),
    prevWeek: Number(fg.previous_1_week),
    prevMonth: Number(fg.previous_1_month),
    prevYear: Number(fg.previous_1_year),
    asOf: fg.timestamp ? new Date(fg.timestamp).toISOString() : new Date().toISOString(),
  };
}

// ---------- NAAIM Exposure Index ----------

async function fetchNAAIM() {
  // ページから XLSX URL を取得
  const pageUrl = 'https://www.naaim.org/programs/naaim-exposure-index/';
  const html = await (await fetch(pageUrl, { headers: { 'User-Agent': UA } })).text();
  const match = html.match(/https?:\/\/[^"']+?\.xlsx/i);
  if (!match) throw new Error('NAAIM: XLSX URL not found on page');
  const xlsxUrl = match[0];

  const buf = await (await fetch(xlsxUrl, { headers: { 'User-Agent': UA } })).arrayBuffer();
  const wb = XLSX.read(new Uint8Array(buf), { type: 'array', cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true });

  // ヘッダー行を探す (Date / NAAIM Number / Mean Average などが含まれる行)
  let headerIdx = rows.findIndex((r) =>
    r.some(
      (c) =>
        typeof c === 'string' &&
        /(NAAIM\s*Number|Mean\s*Average|Mean\s*\(Average\)|Date)/i.test(c),
    ),
  );
  if (headerIdx < 0) headerIdx = 0;
  const header = rows[headerIdx].map((s) => String(s ?? '').trim());

  const dateCol = header.findIndex((h) => /date/i.test(h));
  const meanCol = header.findIndex((h) => /(NAAIM\s*Number|Mean)/i.test(h));
  if (dateCol < 0 || meanCol < 0)
    throw new Error(`NAAIM: header not recognized: ${header.join(' | ')}`);

  // データ行
  const data = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length === 0) continue;
    const date = r[dateCol];
    const v = r[meanCol];
    if (date == null || v == null || v === '') continue;
    const dt =
      date instanceof Date ? date : new Date(typeof date === 'number' ? excelDateToJSDate(date) : String(date));
    if (Number.isNaN(dt.getTime())) continue;
    const num = Number(v);
    if (!Number.isFinite(num)) continue;
    data.push({ date: dt.toISOString(), value: num });
  }
  if (data.length < 2) throw new Error('NAAIM: not enough rows');
  data.sort((a, b) => new Date(a.date) - new Date(b.date));

  const last = data[data.length - 1];
  const prev = data[data.length - 2];

  return {
    current: last.value,
    prev: prev.value,
    weekly: {
      pointChange: last.value - prev.value,
      pctChange: ((last.value - prev.value) / prev.value) * 100,
    },
    asOf: last.date,
    history: data.slice(-52), // 直近52週分
  };
}

function excelDateToJSDate(serial) {
  // Excel の日付シリアル値 (1900/1/1 起点) を JS の epoch ms へ
  const utcDays = Math.floor(serial - 25569);
  return utcDays * 86400 * 1000;
}

// ---------- Main ----------

async function main() {
  await fs.mkdir(OUT, { recursive: true });

  const tasks = [
    ['quotes.json', fetchQuotes],
    ['fear-greed.json', fetchFearGreed],
    ['naaim.json', fetchNAAIM],
  ];

  const errors = [];
  for (const [name, fn] of tasks) {
    console.log(`Fetching ${name}...`);
    try {
      const data = await fn();
      await fs.writeFile(path.join(OUT, name), JSON.stringify(data, null, 2));
      console.log(`✓ wrote ${name}`);
    } catch (e) {
      console.error(`✗ ${name}: ${e.message}`);
      errors.push({ name, message: e.message });
      // 既存ファイルがあれば残す (前回データを維持)
    }
  }

  await fs.writeFile(
    path.join(OUT, 'meta.json'),
    JSON.stringify(
      {
        updatedAt: new Date().toISOString(),
        errors,
      },
      null,
      2,
    ),
  );

  // 1個でも書ければ成功扱い (全滅したらエラー終了)
  if (errors.length === tasks.length) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
