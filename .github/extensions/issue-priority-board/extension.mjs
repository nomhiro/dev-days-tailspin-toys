import { createServer } from "node:http";
import { createCanvas, joinSession } from "@github/copilot-sdk/extension";

const servers = new Map();
const issues = [
    {
        number: 6,
        title: "Implement pagination on the game list page",
        rank: 1,
        reason: "全件表示による性能低下を防ぐ基盤改善で、データ取得と一覧 UI の両方に効き、カタログ拡大時の効果も高いため。",
        body: "src/lib のデータ取得にページ/件数またはカーソル方式を追加し、ゲーム一覧にアクセシブルなページ送りと data-testid を付ける。Vitest と Playwright で検証する。",
    },
    {
        number: 1,
        title: "Add a search box to find games by title",
        rank: 2,
        reason: "ゲームを探すという主要な利用者ニーズを直接解決し、既存の一覧データで発見性を改善できるため。",
        body: "一覧にタイトル検索を追加し、大文字小文字を区別せずに絞り込む。一致なしの表示、アクセシブルなラベル・キーボード操作・フォーカス・data-testid を備え、必要な unit/e2e test を追加する。",
    },
    {
        number: 5,
        title: "Show a catalog summary on the home page",
        rank: 3,
        reason: "ゲーム数と平均評価で訪問者の判断に役立つ情報を示せる一方、既存データのみで実装でき、変更リスクが低いため。",
        body: "ホームにゲーム総数と評価のあるゲームの平均星評価を表示する。空カタログと評価なしを扱い、data-testid を付け、決定的なヘルパーを unit/e2e test で検証する。",
    },
    {
        number: 8,
        title: "Update our repository coding standards",
        body: "コメント方針、db/ と src/lib/ の export 関数への TSDoc/JSDoc、Astro Props の文書化、TypeScript 書式と ESLint、README からの案内を整備する。quality-checks スキル経由で lint を通す。",
    },
    {
        number: 2,
        title: "Allow users to sort the game list",
        body: "タイトル A–Z/Z–A と評価順の並べ替えを追加し、評価なしの順序を定義する。アクセシブルなコントロールと data-testid、unit/e2e test を備える。",
    },
    {
        number: 4,
        title: "Add a publisher page listing that publisher's games",
        body: "出版社ごとの prerendered dynamic page を getStaticPaths() で生成し、名前・説明と既存 game card を表示する。リンク、data-testid、取得ヘルパーと unit/e2e test を追加する。",
    },
    {
        number: 3,
        title: "Show category and publisher descriptions on the game detail page",
        body: "ゲーム詳細にカテゴリーと出版社の説明を表示し、説明がない場合は空のセクションを隠す。取得ヘルパー、data-testid と unit/e2e test を更新する。",
    },
].map((issue) => ({
    ...issue,
    url: `https://github.com/nomhiro/dev-days-tailspin-toys/issues/${issue.number}`,
}));

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function renderCard(issue) {
    return `<article class="card${issue.rank ? " featured" : ""}">
      <div class="card-top"><span class="muted">#${issue.number}</span>${issue.rank ? `<span class="rank">優先度 ${issue.rank}</span>` : ""}</div>
      <h3><a href="${escapeHtml(issue.url)}" target="_blank" rel="noreferrer">#${issue.number} ${escapeHtml(issue.title)}</a></h3>
      ${issue.reason ? `<p class="reason"><strong>優先する理由</strong>${escapeHtml(issue.reason)}</p>` : ""}
      <details><summary>Issue の内容と受け入れ条件</summary><p class="body">${escapeHtml(issue.body)}</p></details>
      <button type="button" data-testid="start-issue-${issue.number}" data-issue="${issue.number}">この Issue に取り組む <span aria-hidden="true">→</span></button>
      <p class="status" role="status" aria-live="polite"></p>
    </article>`;
}

function renderHtml() {
    const prioritized = issues.filter((issue) => issue.rank);
    const backlog = issues.filter((issue) => !issue.rank);
    return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Issue 優先順位ボード</title>
    <style>
      :root { color-scheme: dark; font-family: var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif); color: var(--text-color-default, #e6edf3); background: var(--background-color-default, #101318); }
      * { box-sizing: border-box; }
      body { margin: 0; padding: 24px; font-size: 14px; line-height: 1.5; }
      header, main { max-width: 1320px; margin-left: auto; margin-right: auto; }
      header { display: flex; align-items: end; justify-content: space-between; gap: 16px; margin-bottom: 24px; }
      h1 { margin: 0; font-size: 24px; line-height: 1.2; }
      .subtitle, .basis, .muted, .count, .body { color: var(--text-color-muted, #9aa4b2); }
      .subtitle { margin: 6px 0 0; }
      .basis { max-width: 360px; text-align: right; font-size: 12px; }
      .lane { margin-bottom: 28px; }
      .lane-heading { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
      h2 { margin: 0; font-size: 16px; }
      .count { font-size: 12px; }
      .cards { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; align-items: start; }
      .backlog .cards { grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }
      .card { min-width: 0; padding: 16px; border: 1px solid var(--border-color-default, #30363d); border-radius: 12px; background: color-mix(in srgb, var(--background-color-default, #161b22) 90%, #fff 10%); }
      .card.featured { border-color: var(--true-color-blue, #4493f8); box-shadow: inset 0 2px 0 var(--true-color-blue, #4493f8); }
      .card-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
      .rank { border-radius: 999px; padding: 3px 9px; color: var(--true-color-blue, #4493f8); background: var(--true-color-blue-muted, #172c4c); font-size: 11px; font-weight: 700; }
      h3 { margin: 10px 0 12px; font-size: 16px; line-height: 1.4; }
      a { color: inherit; text-decoration: none; }
      a:hover { text-decoration: underline; }
      .reason { margin: 0 0 14px; color: var(--text-color-muted, #9aa4b2); }
      .reason strong { display: block; margin-bottom: 3px; color: var(--text-color-default, #e6edf3); font-size: 12px; }
      details { margin: 0 0 14px; border-top: 1px solid var(--border-color-default, #30363d); padding-top: 10px; }
      summary { cursor: pointer; color: var(--text-color-muted, #9aa4b2); font-size: 12px; }
      summary:focus-visible, a:focus-visible, button:focus-visible { outline: 2px solid var(--color-focus-outline, #4493f8); outline-offset: 3px; border-radius: 4px; }
      .body { white-space: pre-wrap; overflow-wrap: anywhere; }
      button { width: 100%; display: flex; justify-content: space-between; align-items: center; border: 1px solid var(--true-color-blue, #4493f8); border-radius: 8px; padding: 9px 12px; color: var(--text-color-default, #e6edf3); background: var(--true-color-blue-muted, #172c4c); font: inherit; font-weight: 650; cursor: pointer; }
      button:hover:not(:disabled) { filter: brightness(1.18); }
      button:disabled { cursor: wait; opacity: .7; }
      .status { min-height: 20px; margin: 8px 0 0; color: var(--text-color-muted, #9aa4b2); font-size: 12px; }
      @media (max-width: 900px) { body { padding: 18px; } .cards { grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); } header { align-items: start; flex-direction: column; } .basis { text-align: left; } }
      @media (max-width: 480px) { body { padding: 14px; } .cards, .backlog .cards { grid-template-columns: 1fr; } }
    </style>
  </head>
  <body>
    <header>
      <div><h1>Issue 優先順位ボード</h1><p class="subtitle">今対応したい3件と、残りの backlog</p></div>
      <p class="basis">Issue に優先度ラベルがないため、公開機能への効果・対象範囲・実装の波及効果をもとにした提案です。</p>
    </header>
    <main>
      <section class="lane" aria-labelledby="priority-heading">
        <div class="lane-heading"><h2 id="priority-heading">優先して対応</h2><span class="count">上位 ${prioritized.length} 件</span></div>
        <div class="cards">${prioritized.map(renderCard).join("")}</div>
      </section>
      <section class="lane backlog" aria-labelledby="backlog-heading">
        <div class="lane-heading"><h2 id="backlog-heading">残りの Issue</h2><span class="count">${backlog.length} 件</span></div>
        <div class="cards">${backlog.map(renderCard).join("")}</div>
      </section>
    </main>
    <script>
      document.querySelectorAll("button[data-issue]").forEach((button) => {
        button.addEventListener("click", async () => {
          const status = button.parentElement.querySelector(".status");
          button.disabled = true;
          button.textContent = "セッションに Issue を追加中…";
          try {
            const response = await fetch("/start", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ issue: button.dataset.issue }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Issue を送信できませんでした。");
            status.textContent = "Issue の内容をセッションに追加しました。作業を開始します。";
            button.textContent = "作業を開始しました";
          } catch (error) {
            status.textContent = error.message;
            button.disabled = false;
            button.textContent = "この Issue に取り組む →";
          }
        });
      });
    </script>
  </body>
</html>`;
}

async function readJson(req) {
    let body = "";
    for await (const chunk of req) {
        body += chunk;
        if (body.length > 4096) throw new Error("Request body is too large.");
    }
    return JSON.parse(body);
}

async function startServer(session) {
    const server = createServer((req, res) => {
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("Referrer-Policy", "no-referrer");
        if (req.method === "POST" && req.url === "/start") {
            void (async () => {
                try {
                    const input = await readJson(req);
                    const issue = issues.find((item) => String(item.number) === String(input.issue));
                    if (!issue) {
                        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
                        res.end(JSON.stringify({ error: "指定された Issue はボードにありません。" }));
                        return;
                    }
                    await session.send({
                        prompt: `このセッションで GitHub Issue #${issue.number} に対応してください。

Issue: ${issue.title}
URL: ${issue.url}

内容と受け入れ条件:
${issue.body}

リポジトリの指示と既存パターンに従って、必要な変更・テストまで作業を開始してください。`,
                    });
                    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
                    res.end(JSON.stringify({ ok: true }));
                } catch (error) {
                    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
                    res.end(JSON.stringify({ error: error.message || "セッションへの送信に失敗しました。" }));
                }
            })();
            return;
        }
        if (req.method !== "GET" || req.url !== "/") {
            res.writeHead(404);
            res.end("Not found");
            return;
        }
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end(renderHtml());
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    return { server, url: `http://127.0.0.1:${port}/` };
}

const session = await joinSession({
    canvases: [
        createCanvas({
            id: "shared-issue-priority-board",
            displayName: "Issue 優先順位ボード",
            description: "現在のリポジトリの Issue を優先度上位3件と残りに分け、カードから作業を開始できる共有カンバンボード。",
            open: async (ctx) => {
                let entry = servers.get(ctx.instanceId);
                if (!entry) {
                    entry = await startServer(session);
                    servers.set(ctx.instanceId, entry);
                }
                return { title: "Issue 優先順位ボード", url: entry.url };
            },
            onClose: async (ctx) => {
                const entry = servers.get(ctx.instanceId);
                if (entry) {
                    servers.delete(ctx.instanceId);
                    await new Promise((resolve) => entry.server.close(() => resolve()));
                }
            },
        }),
    ],
});
