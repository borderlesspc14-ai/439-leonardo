import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import type { UserRole } from "../auth/AuthContext";
import { useMainView } from "../context/MainViewContext";
import { DataTable } from "../components/Table";
import type { OrderRow, OrderStatus, OrderAttachment, TableState } from "../components/Table";
import { Button } from "../components/Button";
import { Modal } from "../components/Modal";
import { Input } from "../components/Input";
import { db } from "../firebase";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { ArrowLeft, Trash2, User as UserIcon, FileText, Download } from "lucide-react";

interface Toast {
  id: string;
  message: string;
}

interface PlatformUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  displayName?: string;
  photoBase64?: string;
}

// Headers iniciais da tabela conforme requisitos do cliente
const initialHeaders = [
  "Email",                    // Coluna 0: fixa, não editável
  "Número",                   // Coluna 1
  "Data",                     // Coluna 2
  "Consignatário",            // Coluna 3
  "Agente de Destino",         // Coluna 4
  "Remetente",                // Coluna 5
  "Transportadora",           // Coluna 6
  "Peças",                    // Coluna 7
  "Peso",                     // Coluna 8
  "Volume",                   // Coluna 9
  "Número da Nota Fiscal",    // Coluna 10
  "Observações",              // Coluna 11
  "Número de Rastreamento",    // Coluna 12
];

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  if (!user) return null;

  const [table, setTable] = useState<TableState>({
    headers: initialHeaders,
    rows: [],
  });

  const [toasts, setToasts] = useState<Toast[]>([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newRowValues, setNewRowValues] = useState<string[]>(
    new Array(initialHeaders.length).fill("")
  );
  const [createRowClientPreview, setCreateRowClientPreview] = useState<{
    ownerDisplayName?: string;
    ownerPhotoBase64?: string;
  } | null>(null);
  const [platformUsers, setPlatformUsers] = useState<PlatformUser[]>([]);
  const [deleteAccountId, setDeleteAccountId] = useState<string | null>(null);
  const [detailModalRowId, setDetailModalRowId] = useState<string | null>(null);
  const [newRowFiles, setNewRowFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  const detailModalRow = detailModalRowId ? table.rows.find((r) => r.id === detailModalRowId) ?? null : null;
  const { mainView, setMainView, selectedAccountId, selectedAccountEmail, setSelectedAccount } = useMainView();

  useEffect(() => {
    if (user.role === "MASTER" && mainView === "dashboard") setMainView("accounts");
  }, [user.role, mainView, setMainView]);

  const canCreateRow = useMemo(
    () => user.role === "MASTER" || user.role === "OPERATOR",
    [user.role]
  );

  useEffect(() => {
    const headersRef = doc(db, "table-config", "default");
    const ordersRef = collection(db, "orders");

    // Ouve alterações em tempo real nos headers
    const unsubHeaders = onSnapshot(headersRef, async (snap) => {
      if (snap.exists()) {
        const data = snap.data() as { headers?: string[] };
        if (Array.isArray(data.headers) && data.headers.length > 0) {
          const headers = [...data.headers];
          if (!headers[0]?.trim()) {
            headers[0] = "Email";
            await setDoc(headersRef, { headers }, { merge: true });
          }
          
          // Detecta se são headers antigos (genéricos como "DADO 2", "DADO 3", etc.)
          // ou se o número de colunas não corresponde aos novos headers
          const hasOldHeaders = headers.some((h, i) => 
            i > 0 && (
              h === "" || 
              h.toLowerCase().includes("dado")
            )
          );
          
          // Se detectar headers antigos ou se o número de colunas for diferente, atualiza
          if (hasOldHeaders || headers.length !== initialHeaders.length) {
            // Atualiza para os novos headers
            await setDoc(headersRef, { headers: initialHeaders }, { merge: true });
            setTable((prev) => ({ ...prev, headers: initialHeaders }));
          } else {
            setTable((prev) => ({ ...prev, headers }));
          }
        }
      } else {
        await setDoc(headersRef, { headers: initialHeaders });
        setTable((prev) => ({ ...prev, headers: initialHeaders }));
      }
    });

    // Ouve alterações em tempo real nas linhas (sem dados iniciais; tabela começa vazia)
    const unsubOrders = onSnapshot(ordersRef, (snapshot) => {
      if (snapshot.empty) {
        setTable((prev) => ({ ...prev, rows: [] }));
        return;
      }

      const rows: OrderRow[] = snapshot.docs.map((d) => {
        const data = d.data() as Omit<OrderRow, "id"> & { ownerDisplayName?: string; ownerPhotoBase64?: string };
        
        // Garante que todas as linhas tenham o mesmo número de colunas que os headers
        const columns = Array.isArray(data.columns) ? [...data.columns] : [];
        
        // Preenche com strings vazias se necessário (usa initialHeaders como referência mínima)
        while (columns.length < initialHeaders.length) {
          columns.push("");
        }
        
        // Limita ao número de headers (remove colunas extras se houver)
        const normalizedColumns = columns.slice(0, initialHeaders.length);
        
        return {
          id: d.id,
          ownerId: data.ownerId,
          ownerEmail: data.ownerEmail,
          ownerDisplayName: data.ownerDisplayName,
          ownerPhotoBase64: data.ownerPhotoBase64,
          columns: normalizedColumns,
          status: data.status,
          attachments: Array.isArray(data.attachments) ? data.attachments : [],
        };
      });
      setTable((prev) => ({ ...prev, rows }));
    });

    return () => {
      unsubHeaders();
      unsubOrders();
    };
  }, [user.id]);

  useEffect(() => {
    if (user.role !== "MASTER" || (mainView !== "accounts" && mainView !== "account")) return;
    const usersRef = collection(db, "users");
    getDocs(usersRef).then((snap) => {
      const list: PlatformUser[] = snap.docs.map((d) => {
        const data = d.data() as { name: string; email: string; role: UserRole; displayName?: string; photoBase64?: string };
        return {
          id: d.id,
          name: data.name,
          email: data.email,
          role: data.role,
          displayName: data.displayName,
          photoBase64: data.photoBase64,
        };
      });
      setPlatformUsers(list);
    });
  }, [user.role, mainView]);

  const handleHeadersChange = async (headers: string[]) => {
    const headersRef = doc(db, "table-config", "default");
    await setDoc(headersRef, { headers }, { merge: true });
  };

  const resolveOwnerByEmail = async (email: string): Promise<{
    ownerId: string;
    ownerEmail: string;
    ownerDisplayName?: string;
    ownerPhotoBase64?: string;
  }> => {
    const trimmed = email?.trim().toLowerCase() || "";
    if (!trimmed) return { ownerId: user.id, ownerEmail: user.email };
    const usersRef = collection(db, "users");
    const snap = await getDocs(query(usersRef, where("email", "==", trimmed)));
    if (!snap.empty) {
      const d = snap.docs[0];
      const data = d.data() as { displayName?: string; photoBase64?: string };
      return {
        ownerId: d.id,
        ownerEmail: trimmed,
        ownerDisplayName: data.displayName,
        ownerPhotoBase64: data.photoBase64,
      };
    }
    return { ownerId: "", ownerEmail: trimmed };
  };

  const handleRowChange = async (row: OrderRow) => {
    const rowRef = doc(db, "orders", row.id);
    const resolved = await resolveOwnerByEmail(row.columns[0] ?? "");
    
    // Garante que o array de colunas tenha o mesmo tamanho dos headers
    const columns = [...row.columns];
    while (columns.length < table.headers.length) {
      columns.push("");
    }
    
    await updateDoc(rowRef, {
      ownerId: resolved.ownerId,
      ownerEmail: resolved.ownerEmail,
      ownerDisplayName: resolved.ownerDisplayName ?? null,
      ownerPhotoBase64: resolved.ownerPhotoBase64 ?? null,
      columns: columns.slice(0, table.headers.length), // Garante que não tenha mais colunas que headers
      status: row.status,
    });
  };

  const handleRowDelete = async (id: string) => {
    const rowRef = doc(db, "orders", id);
    await deleteDoc(rowRef);
  };

  const pushToast = (message: string) => {
    const toast: Toast = { id: crypto.randomUUID(), message };
    setToasts((prev) => [...prev, toast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toast.id));
    }, 3500);
  };

  const handleNotifyStatusChange = (userEmail: string, newStatus: OrderStatus) => {
    pushToast(`Notificação de e-mail para ${userEmail}: status atualizado para ${newStatus}.`);
  };

  useEffect(() => {
    if (!createModalOpen) return;
    const email = newRowValues[0]?.trim().toLowerCase() || "";
    if (!email) {
      setCreateRowClientPreview(null);
      return;
    }
    resolveOwnerByEmail(newRowValues[0] ?? "").then((res) => {
      if (res.ownerDisplayName || res.ownerPhotoBase64) {
        setCreateRowClientPreview({
          ownerDisplayName: res.ownerDisplayName,
          ownerPhotoBase64: res.ownerPhotoBase64,
        });
      } else {
        setCreateRowClientPreview(null);
      }
    });
  }, [createModalOpen, newRowValues[0]]);

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleCreateRow = async (e: React.FormEvent) => {
    e.preventDefault();
    const columns = table.headers.map((_, i) => newRowValues[i] ?? "");
    while (columns.length < table.headers.length) columns.push("");
    const resolved = await resolveOwnerByEmail(columns[0] ?? "");
    const ordersRef = collection(db, "orders");

    let attachments: OrderAttachment[] = [];
    if (newRowFiles.length > 0) {
      setUploadingFiles(true);
      try {
        attachments = await Promise.all(
          newRowFiles.map(async (file) => ({
            name: file.name,
            data: await fileToBase64(file),
          }))
        );
      } finally {
        setUploadingFiles(false);
      }
    }

    await addDoc(ordersRef, {
      ownerId: resolved.ownerId,
      ownerEmail: resolved.ownerEmail,
      ownerDisplayName: resolved.ownerDisplayName ?? null,
      ownerPhotoBase64: resolved.ownerPhotoBase64 ?? null,
      columns: columns.slice(0, table.headers.length),
      status: "PENDENTE" as OrderStatus,
      attachments,
    });
    setNewRowValues(table.headers.map(() => ""));
    setNewRowFiles([]);
    setCreateRowClientPreview(null);
    setCreateModalOpen(false);
  };

  const handleAddAttachmentsToOrder = async (orderId: string, files: File[]) => {
    if (files.length === 0) return;
    const row = table.rows.find((r) => r.id === orderId);
    const currentAttachments = row?.attachments ?? [];
    try {
      const uploads: OrderAttachment[] = await Promise.all(
        files.map(async (file) => ({
          name: file.name,
          data: await fileToBase64(file),
        }))
      );
      const rowRef = doc(db, "orders", orderId);
      await updateDoc(rowRef, { attachments: [...currentAttachments, ...uploads] });
    } catch (err) {
      console.error("Erro ao fazer upload:", err);
      pushToast("Erro ao enviar documentos. Tente novamente.");
    }
  };

  const handleConfirmDeleteAccount = async () => {
    if (!deleteAccountId) return;
    await deleteDoc(doc(db, "users", deleteAccountId));
    setPlatformUsers((prev) => prev.filter((u) => u.id !== deleteAccountId));
    setDeleteAccountId(null);
  };

  const tableFilteredByAccount = useMemo(() => {
    if (mainView !== "account" || !selectedAccountId) return null;
    return {
      headers: table.headers,
      rows: table.rows.filter((r) => r.ownerId === selectedAccountId),
    };
  }, [mainView, selectedAccountId, table.headers, table.rows]);

  return (
    <div className="space-y-6">
      {mainView === "accounts" && user.role === "MASTER" && (
        <section>
          <div className="rounded-lg border border-border bg-white overflow-hidden">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-gray-50 border-b border-border">
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-black">
                    Nome
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-black">
                    E-mail
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-black">
                    Perfil
                  </th>
                  <th className="px-3 py-2 text-right text-[10px] font-medium text-black w-12">
                  </th>
                </tr>
              </thead>
              <tbody>
                {platformUsers.map((u) => (
                  <tr
                    key={u.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedAccount(u.id, u.email)}
                    onKeyDown={(e) => e.key === "Enter" && setSelectedAccount(u.id, u.email)}
                    className="border-t border-border hover:bg-gray-100 cursor-pointer"
                  >
                    <td className="px-3 py-2 text-xs text-black">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden flex items-center justify-center">
                          {u.photoBase64 ? (
                            <img src={u.photoBase64} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <UserIcon className="w-4 h-4 text-gray-500" />
                          )}
                        </span>
                        <span>{u.displayName || u.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs text-black">{u.email}</td>
                    <td className="px-3 py-2 text-xs text-black">{u.role}</td>
                    <td className="px-3 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => setDeleteAccountId(u.id)}
                        disabled={u.id === user.id}
                        className="p-1.5 rounded border border-border text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        title={u.id === user.id ? "Não é possível excluir sua própria conta" : "Excluir conta"}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {platformUsers.length === 0 && (
              <div className="px-4 py-8 text-center text-xs text-black">
                Nenhuma conta cadastrada.
              </div>
            )}
          </div>
        </section>
      )}

      {mainView === "account" && user.role === "MASTER" && selectedAccountId && (
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMainView("accounts")}
              className="inline-flex items-center gap-1 text-xs text-black hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar às contas
            </button>
            <span className="text-xs text-black">
              Pedidos de <strong>{selectedAccountEmail}</strong>
            </span>
          </div>
          {tableFilteredByAccount && (
            <DataTable
              state={tableFilteredByAccount}
              currentUser={user}
              onHeadersChange={handleHeadersChange}
              onRowChange={handleRowChange}
              onRowDelete={handleRowDelete}
              onNotifyStatusChange={handleNotifyStatusChange}
              onRowClick={(row) => setDetailModalRowId(row.id)}
            />
          )}
          {tableFilteredByAccount && tableFilteredByAccount.rows.length === 0 && (
            <div className="rounded-lg border border-border bg-white px-4 py-8 text-center text-xs text-black">
              Nenhum pedido para esta conta.
            </div>
          )}
        </section>
      )}

      {mainView === "dashboard" && user.role !== "MASTER" && (
        <>
          <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            {canCreateRow && (
              <Button
                type="button"
                onClick={() => {
                  setNewRowValues(table.headers.map(() => ""));
                  setNewRowFiles([]);
                  setCreateRowClientPreview(null);
                  setCreateModalOpen(true);
                }}
              >
                Novo registro
              </Button>
            )}
          </header>

          <section>
            <DataTable
              state={table}
              currentUser={user}
              onHeadersChange={handleHeadersChange}
              onRowChange={handleRowChange}
              onRowDelete={handleRowDelete}
              onNotifyStatusChange={handleNotifyStatusChange}
              onRowClick={(row) => setDetailModalRowId(row.id)}
            />
          </section>
        </>
      )}

      <Modal
        open={createModalOpen}
        title="Novo registro"
        onClose={() => setCreateModalOpen(false)}
      >
        <form onSubmit={handleCreateRow} className="space-y-3">
          {(user.role === "MASTER" || user.role === "OPERATOR") && (
            <div className="rounded-md border border-border bg-gray-50 px-3 py-2">
              <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-gray-600 mb-1.5">
                Cliente
              </div>
              {createRowClientPreview?.ownerDisplayName || createRowClientPreview?.ownerPhotoBase64 ? (
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden flex items-center justify-center">
                    {createRowClientPreview.ownerPhotoBase64 ? (
                      <img
                        src={createRowClientPreview.ownerPhotoBase64}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <UserIcon className="w-4 h-4 text-gray-500" />
                    )}
                  </span>
                  <span className="text-sm font-medium text-black">
                    {createRowClientPreview.ownerDisplayName || "Cliente"}
                  </span>
                </div>
              ) : (
                <span className="text-xs text-gray-500">Informe o e-mail abaixo para identificar o cliente.</span>
              )}
            </div>
          )}
          {table.headers.map((header, index) => (
            <Input
              key={index}
              label={index === 0 ? "Email" : (header?.trim() || "")}
              placeholder={index === 0 ? "email@exemplo.com" : undefined}
              value={newRowValues[index] ?? ""}
              onChange={(e) => {
                const next = [...newRowValues];
                while (next.length <= index) next.push("");
                next[index] = e.target.value;
                setNewRowValues(next);
              }}
            />
          ))}
          {(user.role === "MASTER" || user.role === "OPERATOR") && (
            <div className="rounded-md border border-border bg-gray-50 px-3 py-2">
              <label className="block text-[10px] font-medium uppercase tracking-[0.16em] text-gray-600 mb-1.5">
                Documentos / PDFs (opcional)
              </label>
              <input
                type="file"
                accept=".pdf,application/pdf"
                multiple
                onChange={(e) => setNewRowFiles(Array.from(e.target.files ?? []))}
                className="block w-full text-xs text-black file:mr-2 file:py-1 file:px-2 file:rounded file:border file:border-border file:bg-white file:text-xs"
              />
              {newRowFiles.length > 0 && (
                <p className="mt-1 text-xs text-gray-500">
                  {newRowFiles.length} arquivo(s) selecionado(s)
                </p>
              )}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setCreateModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={uploadingFiles}>
              {uploadingFiles ? "Enviando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!detailModalRowId}
        title="Detalhes do pedido"
        onClose={() => setDetailModalRowId(null)}
      >
        {detailModalRow && (
          <div className="space-y-4">
            <div className="rounded-md border border-border bg-gray-50 px-3 py-2 text-xs">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {table.headers.map((header, i) => (
                  <div key={i}>
                    <span className="font-medium text-gray-600">{header || `Coluna ${i + 1}`}:</span>{" "}
                    {detailModalRow.columns[i] ?? "—"}
                  </div>
                ))}
              </div>
              <div className="mt-2 pt-2 border-t border-border">
                <span className="font-medium text-gray-600">Status:</span>{" "}
                {detailModalRow.status.replace("_", " ")}
              </div>
            </div>

            <div>
              <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-gray-600 mb-2">
                Documentos anexados
              </div>
              {(detailModalRow.attachments ?? []).length === 0 ? (
                <p className="text-xs text-gray-500">Nenhum documento anexado.</p>
              ) : (
                <ul className="space-y-2">
                  {(detailModalRow.attachments ?? []).map((att, i) => {
                    const href = "data" in att ? att.data : (att as { url?: string }).url ?? "#";
                    return (
                      <li key={i} className="flex items-center gap-2 text-xs">
                        <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <span className="truncate flex-1">{att.name}</span>
                        <a
                          href={href}
                          download={att.name}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-1 rounded border border-border hover:bg-gray-100 text-black"
                        >
                          <Download className="w-3 h-3" />
                          Baixar
                        </a>
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-1 rounded border border-border hover:bg-gray-100 text-black"
                        >
                          Visualizar
                        </a>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {(user.role === "MASTER" || user.role === "OPERATOR") && (
              <div className="rounded-md border border-border bg-gray-50 px-3 py-2">
                <label className="block text-[10px] font-medium uppercase tracking-[0.16em] text-gray-600 mb-1.5">
                  Adicionar documentos
                </label>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    if (files.length > 0) handleAddAttachmentsToOrder(detailModalRow.id, files);
                    e.target.value = "";
                  }}
                  className="block w-full text-xs text-black file:mr-2 file:py-1 file:px-2 file:rounded file:border file:border-border file:bg-white file:text-xs"
                />
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button type="button" variant="ghost" onClick={() => setDetailModalRowId(null)}>
                Fechar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={!!deleteAccountId}
        title="Excluir conta"
        onClose={() => setDeleteAccountId(null)}
      >
        <div className="space-y-4">
          <p className="text-sm text-black">
            Você quer excluir mesmo? Esta conta e as informações vinculadas serão removidas. Esta ação não pode ser desfeita.
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setDeleteAccountId(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => handleConfirmDeleteAccount()}
              className="bg-red-600 text-white hover:bg-red-700 border-red-600"
            >
              Excluir
            </Button>
          </div>
        </div>
      </Modal>

      {/* Toasts */}
      <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="rounded-md border border-border bg-white px-3 py-2 text-[11px] text-black shadow-lg"
          >
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
};

