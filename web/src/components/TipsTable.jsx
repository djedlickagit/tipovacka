import React, { useEffect, useMemo, useState } from "react";
import { formatDate } from "../utils/format";

const TIPS_PER_PAGE = 12;

export default function TipsTable({ tips, onEdit, onDelete, onBulkDelete }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);

  const filteredTips = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tips;

    return tips.filter((tip) =>
      [tip.user_name, tip.user_login_name, tip.home_team, tip.away_team, tip.stage, tip.group_name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [tips, search]);

  const pageCount = Math.max(1, Math.ceil(filteredTips.length / TIPS_PER_PAGE));
  const currentPage = Math.min(page, pageCount);
  const pagedTips = filteredTips.slice((currentPage - 1) * TIPS_PER_PAGE, currentPage * TIPS_PER_PAGE);
  const pagedIds = pagedTips.map((tip) => Number(tip.id));
  const allPageSelected = pagedIds.length > 0 && pagedIds.every((id) => selectedIds.includes(id));

  useEffect(() => {
    const existingIds = new Set(tips.map((tip) => Number(tip.id)));
    setSelectedIds((prev) => prev.filter((id) => existingIds.has(Number(id))));
  }, [tips]);

  function toggleOne(id) {
    const numericId = Number(id);
    setSelectedIds((prev) =>
      prev.includes(numericId)
        ? prev.filter((item) => item !== numericId)
        : [...prev, numericId]
    );
  }

  function togglePage() {
    setSelectedIds((prev) => {
      if (allPageSelected) return prev.filter((id) => !pagedIds.includes(Number(id)));
      return [...new Set([...prev, ...pagedIds])];
    });
  }

  function clearSelection() {
    setSelectedIds([]);
  }

  return (
    <div className="card wide-card">
      <div className="section-head tips-head">
        <div>
          <h2>Uložené tipy</h2>
          <p className="muted">Admin může tip upravit, smazat jednotlivě nebo hromadně. Po změnách doporučujeme znovu spustit vyhodnocení.</p>
        </div>
        <label className="search-field">Vyhledat
          <input
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(1); }}
            placeholder="tipovač, tým, skupina…"
          />
        </label>
      </div>

      <div className="bulk-actions-bar">
        <div>
          <strong>{selectedIds.length}</strong> vybraných tipů
          {selectedIds.length > 0 && <button type="button" className="link-button" onClick={clearSelection}>zrušit výběr</button>}
        </div>
        <button
          type="button"
          className="btn btn-danger"
          disabled={selectedIds.length === 0}
          onClick={() => onBulkDelete?.(selectedIds)}
        >
          Smazat vybrané
        </button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th className="check-col">
                <input type="checkbox" checked={allPageSelected} onChange={togglePage} aria-label="Vybrat zobrazené tipy" />
              </th>
              <th>Tipovač</th>
              <th>Zápas</th>
              <th>Začátek</th>
              <th>Tip</th>
              <th>Výsledek</th>
              <th>Body</th>
              <th>Akce</th>
            </tr>
          </thead>
          <tbody>
            {pagedTips.map((tip) => {
              const id = Number(tip.id);
              return (
                <tr key={tip.id} className={selectedIds.includes(id) ? "is-selected-row" : ""}>
                  <td className="check-col">
                    <input type="checkbox" checked={selectedIds.includes(id)} onChange={() => toggleOne(id)} aria-label={`Vybrat tip ${tip.id}`} />
                  </td>
                  <td>
                    <strong>{tip.user_name}</strong>
                    {tip.user_login_name && <span className="subline">{tip.user_login_name}</span>}
                  </td>
                  <td>
                    <strong>{tip.home_team} – {tip.away_team}</strong>
                    {(tip.stage || tip.group_name) && <span className="subline">{tip.stage || "-"}{tip.group_name ? ` · skupina ${tip.group_name}` : ""}</span>}
                  </td>
                  <td>{formatDate(tip.start_time)}</td>
                  <td><strong>{tip.home_tip} : {tip.away_tip}</strong></td>
                  <td>{tip.home_score ?? "-"} : {tip.away_score ?? "-"}</td>
                  <td>{tip.points ?? "nevyhodnoceno"}</td>
                  <td>
                    <div className="row-actions compact-actions">
                      <button className="btn-mini" type="button" onClick={() => onEdit?.(tip)}>Upravit</button>
                      <button className="btn-mini danger" type="button" onClick={() => onDelete?.(tip)}>Smazat</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!pagedTips.length && <tr><td colSpan="8"><div className="empty-line">Žádný tip neodpovídá hledání.</div></td></tr>}
          </tbody>
        </table>
      </div>

      <div className="pagination-bar">
        <span>Zobrazeno {pagedTips.length} z {filteredTips.length}</span>
        <div className="pagination-buttons">
          <button className="btn-mini" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Předchozí</button>
          <strong>{currentPage} / {pageCount}</strong>
          <button className="btn-mini" disabled={currentPage >= pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))}>Další</button>
        </div>
      </div>
    </div>
  );
}
