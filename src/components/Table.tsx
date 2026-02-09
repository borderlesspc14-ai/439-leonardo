import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import emailjs from "@emailjs/browser";
import type { AppUser, UserRole } from "../auth/AuthContext";
import { Trash2, Send, User, FileText } from "lucide-react";

export type OrderStatus = "PENDENTE" | "EM_ANALISE" | "APROVADO" | "REJEITADO";

/** Anexo de documento/PDF no pedido (armazenado em base64 no Firestore) */
export interface OrderAttachment {
  name: string;
  /** Data URL em base64 (ex: data:application/pdf;base64,...) */
  data: string;
}

export interface OrderRow {
  id: string;
  ownerId: string;
  ownerEmail: string;
  /** Nome fantasia do cliente (quando encontrado por e-mail). */
  ownerDisplayName?: string;
  /** Foto do cliente em base64 (quando encontrado por e-mail). */
  ownerPhotoBase64?: string;
  columns: string[];
  status: OrderStatus;
  /** Documentos/PDFs anexados ao pedido */
  attachments?: OrderAttachment[];
}

export interface TableState {
  headers: string[];
  rows: OrderRow[];
}

interface TableProps {
  state: TableState;
  currentUser: AppUser;
  onHeadersChange: (headers: string[]) => void;
  onRowChange: (row: OrderRow) => void;
  onRowDelete: (id: string) => void;
  onNotifyStatusChange: (userEmail: string, newStatus: OrderStatus) => void;
  onRowClick?: (row: OrderRow) => void;
}

const canEditStatus = (role: UserRole): boolean => role === "OPERATOR";

const isReadOnly = (role: UserRole): boolean => role === "CLIENT";

/** Classes por status para fundo e texto (tema claro). */
const getStatusClasses = (status: OrderStatus): string => {
  switch (status) {
    case "PENDENTE":
      return "bg-amber-100 text-amber-800 border-amber-300";
    case "EM_ANALISE":
      return "bg-sky-100 text-sky-800 border-sky-300";
    case "APROVADO":
      return "bg-emerald-100 text-emerald-800 border-emerald-300";
    case "REJEITADO":
      return "bg-red-100 text-red-800 border-red-300";
    default:
      return "bg-gray-100 text-gray-800 border-gray-300";
  }
};

/**
 * Envia um e-mail de notificação de mudança de status via EmailJS.
 * Usa variáveis de ambiente do Vite para não deixar IDs fixos no código.
 *
 * Necessário configurar no .env:
 * - VITE_EMAILJS_SERVICE_ID
 * - VITE_EMAILJS_TEMPLATE_ID
 * - VITE_EMAILJS_PUBLIC_KEY
 *
 * E no template do EmailJS, campos como:
 * - to_email
 * - status
 * - status_label
 * - order_id (opcional)
 */
export const sendEmailNotification = (userEmail: string, newStatus: OrderStatus, orderId?: string) => {
  const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID as string | undefined;
  const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID as string | undefined;
  const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY as string | undefined;

  if (!serviceId || !templateId || !publicKey) {
    // Evita quebrar a UI caso o EmailJS não esteja configurado ainda
    console.warn("[EmailJS] Variáveis de ambiente não configuradas. Notificação não enviada.", {
      serviceId: !!serviceId,
      templateId: !!templateId,
      publicKey: !!publicKey,
    });
    return;
  }

  const statusLabelMap: Record<OrderStatus, string> = {
    PENDENTE: "Pendente",
    EM_ANALISE: "Em análise",
    APROVADO: "Aprovado",
    REJEITADO: "Rejeitado",
  };

  const trimEmail = (userEmail || "").trim().toLowerCase();
  if (!trimEmail) return;

  emailjs
    .send(
      serviceId,
      templateId,
      {
        to_email: trimEmail,
        status: newStatus,
        status_label: statusLabelMap[newStatus],
        order_id: orderId ?? "",
      },
      { publicKey }
    )
    .then(
      () => {
        // sucesso silencioso; feedback visual é dado via toast no Dashboard
        console.info("[EmailJS] Notificação de status enviada para", trimEmail);
      },
      (error) => {
        console.error("[EmailJS] Falha ao enviar notificação de status", error);
      }
    );
};

export const DataTable: React.FC<TableProps> = ({
  state,
  currentUser,
  onHeadersChange,
  onRowChange,
  onRowDelete,
  onNotifyStatusChange,
  onRowClick,
}) => {
  const readOnly = isReadOnly(currentUser.role);
  const showClientColumn = currentUser.role === "MASTER" || currentUser.role === "OPERATOR";
  const [forwardRowId, setForwardRowId] = useState<string | null>(null);
  const [dropdownAnchor, setDropdownAnchor] = useState<{ bottom: number; right: number } | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollState, setScrollState] = useState({ scrollLeft: 0, scrollWidth: 0, clientWidth: 0 });

  const handleHeaderChange = (index: number, value: string) => {
    const next = [...state.headers];
    next[index] = value;
    onHeadersChange(next);
  };

  const handleStatusChange = (row: OrderRow, newStatus: OrderStatus) => {
    const updated: OrderRow = { ...row, status: newStatus };
    onRowChange(updated);
    sendEmailNotification(row.ownerEmail, newStatus, row.id);
    onNotifyStatusChange(row.ownerEmail, newStatus);
  };

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const update = () => {
      setScrollState({ scrollLeft: el.scrollLeft, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth });
    };
    update();
    el.addEventListener("scroll", update);
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [state.rows, state.headers, showClientColumn]);

  const handleCellChange = (row: OrderRow, colIndex: number, value: string) => {
    // Garante que o array tenha o mesmo tamanho dos headers
    const nextCols = [...row.columns];
    // Preenche com strings vazias se necessário
    while (nextCols.length < state.headers.length) {
      nextCols.push("");
    }
    nextCols[colIndex] = value;
    onRowChange({ ...row, columns: nextCols });
  };

  const { scrollLeft, scrollWidth, clientWidth } = scrollState;
  const canScroll = scrollWidth > clientWidth;
  const maxScroll = Math.max(0, scrollWidth - clientWidth);
  const scrollPct = maxScroll > 0 ? (scrollLeft / maxScroll) * 100 : 0;

  const handleScrollBarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pct = Number(e.target.value) / 100;
    const el = scrollContainerRef.current;
    if (el) el.scrollLeft = pct * maxScroll;
  };

  return (
    <div className="w-full rounded-lg border border-border bg-white flex flex-col">
      <style>{`
        .table-scroll-body::-webkit-scrollbar { display: none; }
        .table-scroll-body { scrollbar-width: none; -ms-overflow-style: none; }
      `}</style>
      <div ref={scrollContainerRef} className="overflow-x-auto table-scroll-body overflow-y-visible">
        <table className="w-full border-collapse text-sm" style={{ minWidth: 'max-content' }}>
        <thead className="border-b border-border bg-gray-50">
          <tr>
            {showClientColumn && (
              <th className="px-3 py-2 text-left align-middle text-[10px] font-medium uppercase tracking-[0.16em] text-black border-r border-border">
                Cliente
              </th>
            )}
            {state.headers.map((header, index) => (
              <th
                key={index}
                className="px-3 py-2 text-left align-middle text-[10px] font-medium uppercase tracking-[0.16em] text-black border-r border-border last:border-r-0 whitespace-nowrap"
              >
                {index === 0 ? (
                  <span className="block w-full text-[10px] font-medium uppercase tracking-[0.16em] text-black">
                    Email
                  </span>
                ) : (
                  <input
                    type="text"
                    value={header}
                    disabled={readOnly}
                    onChange={(e) => handleHeaderChange(index, e.target.value)}
                    className="bg-transparent border-none text-[10px] font-medium uppercase tracking-[0.16em] text-black placeholder:text-gray-700 focus-visible:outline-none min-w-[100px]"
                    style={{ width: 'auto', minWidth: '100px' }}
                    placeholder=""
                  />
                )}
              </th>
            ))}
            <th className="px-3 py-2 text-left text-[10px] font-medium uppercase tracking-[0.16em] text-black border-l border-border">
              Status
            </th>
            <th className="px-3 py-2 text-center text-[10px] font-medium text-black border-l border-border w-12">
              Ver
            </th>
            {(currentUser.role === "MASTER" || currentUser.role === "OPERATOR") && (
              <th className="px-3 py-2 text-center text-[10px] font-medium text-black border-l border-border w-14">
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {state.rows.map((row) => {
            const canEditThisRow =
              currentUser.role === "MASTER" || currentUser.role === "OPERATOR";
            const isOwner = row.ownerId === currentUser.id;
            const rowVisible =
              currentUser.role === "MASTER" ||
              currentUser.role === "OPERATOR" ||
              (currentUser.role === "CLIENT" && isOwner);

            if (!rowVisible) return null;

            return (
              <tr
                key={row.id}
                className="border-t border-border hover:bg-gray-50 transition-colors"
              >
                {showClientColumn && (
                  <td className="px-3 py-2 align-middle text-xs text-black border-r border-border min-w-[140px]">
                    {(row.ownerDisplayName || row.ownerPhotoBase64) ? (
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden flex items-center justify-center">
                          {row.ownerPhotoBase64 ? (
                            <img src={row.ownerPhotoBase64} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-4 h-4 text-gray-500" />
                          )}
                        </span>
                        <span className="truncate text-[11px] font-medium text-black">{row.ownerDisplayName || "Cliente"}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                )}
                {state.headers.map((header, colIndex) => {
                  // Garante que todas as linhas tenham o mesmo número de colunas que os headers
                  const value = row.columns[colIndex] ?? "";
                  return (
                    <td
                      key={colIndex}
                      className="px-3 py-2 align-middle text-xs text-black whitespace-nowrap border-r border-border last:border-r-0"
                    >
                      {readOnly ? (
                        <span>{value}</span>
                      ) : (
                        <input
                          type="text"
                          value={value}
                          onChange={(e) =>
                            handleCellChange(row, colIndex, e.target.value)
                          }
                          disabled={!canEditThisRow}
                          className="bg-white border border-transparent rounded-md px-2 py-1 text-xs text-black placeholder:text-gray-700 focus-visible:outline-none focus-visible:border-border focus-visible:ring-1 focus-visible:ring-border min-w-[120px]"
                          style={{ width: 'auto', minWidth: '120px' }}
                        />
                      )}
                    </td>
                  );
                })}
                <td className="px-3 py-2 align-middle text-xs border-l border-border">
                  {canEditStatus(currentUser.role) ? (
                    <select
                      value={row.status}
                      onChange={(e) =>
                        handleStatusChange(row, e.target.value as OrderStatus)
                      }
                      className={`w-full border rounded-md px-2 py-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ${getStatusClasses(row.status)}`}
                    >
                      <option value="PENDENTE" className="bg-amber-100 text-amber-800">Pendente</option>
                      <option value="EM_ANALISE" className="bg-sky-100 text-sky-800">Em análise</option>
                      <option value="APROVADO" className="bg-emerald-100 text-emerald-800">Aprovado</option>
                      <option value="REJEITADO" className="bg-red-100 text-red-800">Rejeitado</option>
                    </select>
                  ) : (
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] ${getStatusClasses(row.status)}`}>
                      {row.status.replace("_", " ")}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 align-middle text-center border-l border-border">
                  <button
                    type="button"
                    onClick={() => onRowClick?.(row)}
                    className="p-1.5 rounded-md border border-border text-black hover:bg-gray-100 transition-colors"
                    title="Ver detalhes e documentos"
                  >
                    <FileText className="w-4 h-4" />
                  </button>
                </td>
                {(currentUser.role === "MASTER" || currentUser.role === "OPERATOR") && (
                  <td className="px-3 py-2 align-middle text-center text-xs text-black border-l border-border">
                    <div className="inline-flex items-center justify-center gap-1 relative">
                      {currentUser.role === "MASTER" && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              if (forwardRowId === row.id) {
                                setForwardRowId(null);
                                setDropdownAnchor(null);
                              } else {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setDropdownAnchor({ bottom: rect.bottom, right: rect.right });
                                setForwardRowId(row.id);
                              }
                            }}
                            className="p-1.5 rounded-md border border-border text-black hover:bg-gray-50 hover:text-black transition-colors"
                            title="Encaminhar"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                          {forwardRowId === row.id && dropdownAnchor && createPortal(
                            <>
                              <div
                                className="fixed inset-0 z-[100]"
                                aria-hidden
                                onClick={() => {
                                  setForwardRowId(null);
                                  setDropdownAnchor(null);
                                }}
                              />
                              <div
                                className="fixed z-[101] min-w-[160px] rounded-md border border-border bg-white py-1 shadow-lg"
                                style={{
                                  top: dropdownAnchor.bottom + 4,
                                  left: Math.max(8, dropdownAnchor.right - 160),
                                }}
                              >
                                <a
                                  href={`https://wa.me/?text=${encodeURIComponent(
                                    `Pedido/Registro: ${row.columns.join(" | ")} - Status: ${row.status}`
                                  )}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block px-3 py-2 text-left text-xs text-gray-900 hover:bg-gray-50"
                                  onClick={() => {
                                    setForwardRowId(null);
                                    setDropdownAnchor(null);
                                  }}
                                >
                                  WhatsApp
                                </a>
                                <a
                                  href={`mailto:?subject=Registro ${row.id}&body=${encodeURIComponent(
                                    row.columns.join("\n") + "\n\nStatus: " + row.status
                                  )}`}
                                  className="block px-3 py-2 text-left text-xs text-gray-900 hover:bg-gray-50"
                                  onClick={() => {
                                    setForwardRowId(null);
                                    setDropdownAnchor(null);
                                  }}
                                >
                                  E-mail
                                </a>
                                <button
                                  type="button"
                                  className="block w-full px-3 py-2 text-left text-xs text-gray-900 hover:bg-gray-50"
                                  onClick={() => {
                                    navigator.clipboard.writeText(
                                      row.columns.join(" | ") + " | Status: " + row.status
                                    );
                                    setForwardRowId(null);
                                    setDropdownAnchor(null);
                                  }}
                                >
                                  Copiar texto
                                </button>
                              </div>
                            </>,
                            document.body
                          )}
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => onRowDelete(row.id)}
                        className="p-1.5 rounded-md border border-border text-red-600 hover:bg-red-50 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
      {canScroll && (
        <div className="border-t border-border px-2 py-2 flex-shrink-0">
          <input
            type="range"
            min={0}
            max={100}
            step={0.1}
            value={scrollPct}
            onChange={handleScrollBarChange}
            className="w-full h-2 accent-gray-500 cursor-pointer"
            title="Arrastar para rolar horizontalmente"
          />
        </div>
      )}
    </div>
  );
};

