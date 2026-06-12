import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";

export default function Vault() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auth state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadCategory, setUploadCategory] = useState("Strategy");
  const [uploadDescription, setUploadDescription] = useState("");

  // Query auth state
  const { data: user, isLoading: authLoading } = trpc.vaultAuth.me.useQuery();
  const utils = trpc.useUtils();

  // Mutations
  const login = trpc.vaultAuth.login.useMutation({
    onSuccess: () => {
      utils.vaultAuth.me.invalidate();
      utils.vaultFiles.list.invalidate();
      setLoginError("");
    },
    onError: (err) => setLoginError(err.message),
  });

  const logout = trpc.vaultAuth.logout.useMutation({
    onSuccess: () => {
      utils.vaultAuth.me.invalidate();
      utils.vaultFiles.list.invalidate();
    },
  });

  const deleteFile = trpc.vaultFiles.delete.useMutation({
    onSuccess: () => utils.vaultFiles.list.invalidate(),
  });

  const uploadFile = trpc.vaultFiles.upload.useMutation({
    onSuccess: () => {
      utils.vaultFiles.list.invalidate();
      setUploading(false);
      setUploadDescription("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    onError: () => setUploading(false),
  });

  const { data: files, isLoading: filesLoading } =
    trpc.vaultFiles.list.useQuery(undefined, {
      enabled: !!user,
      retry: false,
    });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    login.mutate({ username, password });
  };

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(",")[1];
        const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`;
        uploadFile.mutate({
          filename,
          originalName: file.name,
          mimeType: file.type,
          size: file.size,
          data: base64,
          category: uploadCategory,
          description: uploadDescription,
        });
      };
      reader.readAsDataURL(file);
    },
    [uploadCategory, uploadDescription, uploadFile]
  );

  const formatSize = (bytes?: number) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Categories for filter
  const categories = [
    "All",
    ...Array.from(new Set(files?.map((f) => f.category).filter(Boolean) || [])),
  ];
  const [selectedCategory, setSelectedCategory] = useState("All");

  const filteredFiles =
    selectedCategory === "All"
      ? files
      : files?.filter((f) => f.category === selectedCategory);

  // LOGIN SCREEN
  if (!user) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-6"
        style={{ background: "#0A0A0D" }}
      >
        <div className="w-full max-w-sm">
          <button
            onClick={() => navigate("/")}
            className="text-xs tracking-widest uppercase mb-12 block transition-colors hover:text-white"
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              color: "#6A6450",
            }}
          >
            ← Back to site
          </button>

          <div
            className="text-2xl mb-2"
            style={{
              fontFamily: "'Fraunces', serif",
              color: "#EFE7D6",
              letterSpacing: "0.08em",
            }}
          >
            IDENTIT<b style={{ color: "#C79A4F" }}>É</b>
          </div>
          <p
            className="text-sm mb-10"
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              color: "#6A6450",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              fontSize: "11px",
            }}
          >
            Strategy Vault
          </p>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label
                className="block text-xs uppercase tracking-widest mb-2"
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  color: "#6A6450",
                }}
              >
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded outline-none transition-colors"
                style={{
                  background: "#141318",
                  border: "1px solid #2A2830",
                  color: "#EFE7D6",
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  fontSize: "14px",
                }}
                placeholder="admin"
                autoFocus
              />
            </div>
            <div>
              <label
                className="block text-xs uppercase tracking-widest mb-2"
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  color: "#6A6450",
                }}
              >
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded outline-none transition-colors"
                style={{
                  background: "#141318",
                  border: "1px solid #2A2830",
                  color: "#EFE7D6",
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  fontSize: "14px",
                }}
                onKeyDown={(e) =>
                  e.key === "Enter" && handleLogin(e as unknown as React.FormEvent)
                }
              />
            </div>

            {loginError && (
              <p className="text-sm" style={{ color: "#B5543A" }}>
                {loginError}
              </p>
            )}

            <button
              type="submit"
              disabled={login.isPending}
              className="w-full py-3 rounded transition-all hover:opacity-90 disabled:opacity-50"
              style={{
                background: "#C79A4F",
                color: "#0A0A0D",
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: "12px",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                fontWeight: 500,
              }}
            >
              {login.isPending ? "Authenticating..." : "Enter Vault"}
            </button>
          </form>

          <p
            className="mt-8 text-center"
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "10px",
              color: "#3A3830",
              letterSpacing: "0.1em",
            }}
          >
            Default: admin / 1-Lozina
          </p>
        </div>
      </div>
    );
  }

  // FILE MANAGER
  return (
    <div className="min-h-screen" style={{ background: "#0A0A0D" }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 lg:px-10 py-5"
        style={{ borderBottom: "1px solid #1A1917" }}
      >
        <div className="flex items-center gap-6">
          <button
            onClick={() => navigate("/")}
            className="text-lg tracking-wide transition-colors hover:text-white"
            style={{
              fontFamily: "'Fraunces', serif",
              color: "#EFE7D6",
            }}
          >
            IDENTIT<b style={{ color: "#C79A4F" }}>É</b>
          </button>
          <span
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "10px",
              color: "#6A6450",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
            }}
          >
            Strategy Vault
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "11px",
              color: "#6A6450",
            }}
          >
            {user.name || user.username}
          </span>
          <button
            onClick={() => logout.mutate()}
            className="px-4 py-2 rounded transition-colors hover:bg-white/5"
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "10px",
              color: "#6A6450",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              border: "1px solid #2A2830",
            }}
          >
            Log Out
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 lg:px-10 py-10">
        {/* Upload Section */}
        <div
          className="rounded-lg p-6 mb-10"
          style={{ background: "#111318", border: "1px solid #1A1917" }}
        >
          <h3
            className="mb-4"
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "11px",
              color: "#C79A4F",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
            }}
          >
            Upload Document
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label
                className="block text-xs uppercase tracking-wider mb-1.5"
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: "9px",
                  color: "#5A5648",
                }}
              >
                Category
              </label>
              <select
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value)}
                className="w-full px-3 py-2.5 rounded outline-none"
                style={{
                  background: "#141318",
                  border: "1px solid #2A2830",
                  color: "#EFE7D6",
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  fontSize: "13px",
                }}
              >
                <option>Strategy</option>
                <option>Planning</option>
                <option>Research</option>
                <option>Financial</option>
                <option>Legal</option>
                <option>Other</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label
                className="block text-xs uppercase tracking-wider mb-1.5"
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: "9px",
                  color: "#5A5648",
                }}
              >
                Description (optional)
              </label>
              <input
                type="text"
                value={uploadDescription}
                onChange={(e) => setUploadDescription(e.target.value)}
                placeholder="Brief description of this document..."
                className="w-full px-3 py-2.5 rounded outline-none"
                style={{
                  background: "#141318",
                  border: "1px solid #2A2830",
                  color: "#EFE7D6",
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  fontSize: "13px",
                }}
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              className="hidden"
              id="vault-file-input"
            />
            <label
              htmlFor="vault-file-input"
              className="px-5 py-2.5 rounded cursor-pointer transition-all hover:opacity-90"
              style={{
                background: "#C79A4F",
                color: "#0A0A0D",
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: "11px",
                letterSpacing: "0.1em",
                fontWeight: 500,
              }}
            >
              {uploading ? "Uploading..." : "Choose File"}
            </label>
            <span
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: "10px",
                color: "#5A5648",
              }}
            >
              PDF, DOC, XLS, PPT, or any file type
            </span>
          </div>
        </div>

        {/* File List */}
        <div className="flex items-center justify-between mb-6">
          <h2
            style={{
              fontFamily: "'Fraunces', serif",
              fontSize: "24px",
              color: "#EFE7D6",
              fontWeight: 300,
            }}
          >
            Documents
          </h2>

          {/* Category filter */}
          <div className="flex gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className="px-3 py-1 rounded-full transition-all"
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: "10px",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  background:
                    selectedCategory === cat ? "#C79A4F22" : "transparent",
                  color:
                    selectedCategory === cat ? "#C79A4F" : "#6A6450",
                  border:
                    selectedCategory === cat
                      ? "1px solid #C79A4F44"
                      : "1px solid #2A2830",
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {filesLoading ? (
          <p
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "11px",
              color: "#6A6450",
            }}
          >
            Loading...
          </p>
        ) : !filteredFiles?.length ? (
          <div
            className="text-center py-20 rounded-lg"
            style={{
              background: "#111318",
              border: "1px dashed #2A2830",
            }}
          >
            <p
              style={{
                fontFamily: "'Fraunces', serif",
                fontSize: "18px",
                color: "#6A6450",
              }}
            >
              No documents yet
            </p>
            <p
              className="mt-2"
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: "11px",
                color: "#5A5648",
              }}
            >
              Upload your first file above
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between px-5 py-4 rounded-lg transition-colors hover:bg-white/[0.02]"
                style={{
                  background: "#111318",
                  border: "1px solid #1A1917",
                }}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: "#1A1917" }}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#C79A4F"
                      strokeWidth="1.5"
                    >
                      <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" />
                      <polyline points="13 2 13 9 20 9" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p
                      className="truncate"
                      style={{
                        fontFamily: "'Hanken Grotesk', sans-serif",
                        fontSize: "14px",
                        color: "#EFE7D6",
                        fontWeight: 500,
                      }}
                    >
                      {file.originalName}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                      {file.category && (
                        <span
                          className="px-2 py-0.5 rounded-full"
                          style={{
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: "9px",
                            color: "#5E7C6B",
                            background: "#5E7C6B15",
                            letterSpacing: "0.05em",
                          }}
                        >
                          {file.category}
                        </span>
                      )}
                      <span
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: "10px",
                          color: "#5A5648",
                        }}
                      >
                        {formatSize(file.size)}
                      </span>
                      <span
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: "10px",
                          color: "#5A5648",
                        }}
                      >
                        {formatDate(file.createdAt)}
                      </span>
                      {file.uploadedBy && (
                        <span
                          style={{
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: "10px",
                            color: "#4A4638",
                          }}
                        >
                          by {file.uploadedBy}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <a
                    href={`/api/vault/download/${file.filename}`}
                    download={file.originalName}
                    className="px-4 py-2 rounded transition-colors hover:bg-white/5"
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: "10px",
                      color: "#C79A4F",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      border: "1px solid #C79A4F33",
                    }}
                  >
                    Download
                  </a>
                  <button
                    onClick={() => {
                      if (
                        confirm(
                          `Delete "${file.originalName}"?`
                        )
                      )
                        deleteFile.mutate({ id: file.id });
                    }}
                    className="p-2 rounded transition-colors hover:bg-white/5"
                    style={{ color: "#5A5648" }}
                    title="Delete"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
