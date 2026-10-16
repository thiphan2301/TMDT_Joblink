import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { Upload, FileText, Download, Check } from "lucide-react";

import {
    getMyCvs,
    uploadCv,
    setDefaultCv,
    downloadCv,
} from "../services/cvService";

import "../style/CvManager.css";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

function formatDate(value) {
    if (!value) return "";

    const parts = String(value).slice(0, 10).split("-");

    if (parts.length !== 3) return "";

    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
}

export default function CvManager() {
    const fileInputRef = useRef(null);

    const [cvs, setCvs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [retry, setRetry] = useState(0);

    // Rỗng nghĩa là không có thao tác đang chạy.
    const [working, setWorking] = useState("");
    const [notice, setNotice] = useState("");
    const [actionError, setActionError] = useState(null);

    const busy = working !== "";
    const disabled = loading || busy || Boolean(loadError);
    const needLogin =
        loadError?.status === 401 || actionError?.status === 401;

    useEffect(() => {
        const controller = new AbortController();

        setLoading(true);
        setLoadError(null);

        getMyCvs(controller.signal)
            .then((data) => {
                if (!controller.signal.aborted) {
                    setCvs(data);
                }
            })
            .catch((error) => {
                if (error.name !== "AbortError") {
                    setLoadError(error);
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            });

        return () => controller.abort();
    }, [retry]);

    function clearMessages() {
        setNotice("");
        setActionError(null);
    }

    async function handleFileChange(event) {
        const file = event.target.files?.[0];

        // Cho phép chọn lại cùng một file sau khi có lỗi.
        event.target.value = "";

        if (!file || disabled) return;

        clearMessages();

        if (!file.name.toLowerCase().endsWith(".pdf")) {
            setActionError(new Error("Vui lòng chọn CV định dạng PDF."));
            return;
        }

        if (file.size === 0) {
            setActionError(new Error("File CV đang trống."));
            return;
        }

        if (file.size > MAX_FILE_SIZE) {
            setActionError(new Error("File CV không được vượt quá 5 MB."));
            return;
        }

        setWorking("upload");

        try {
            const uploaded = await uploadCv(file);

            // Thêm kết quả backend trả về vào đầu danh sách.
            setCvs((previous) => [
                uploaded,
                ...previous.map((cv) =>
                    uploaded.defaultCv
                        ? { ...cv, defaultCv: false }
                        : cv
                ),
            ]);

            setNotice(
                uploaded.defaultCv
                    ? "Đã tải CV lên và chọn làm CV mặc định."
                    : "Đã tải CV lên thành công."
            );
        } catch (error) {
            setActionError(error);
        } finally {
            setWorking("");
        }
    }

    async function handleSetDefault(id) {
        if (disabled) return;

        clearMessages();
        setWorking(`default:${id}`);

        try {
            const updated = await setDefaultCv(id);

            setCvs((previous) =>
                previous.map((cv) =>
                    cv.id === updated.id
                        ? updated
                        : { ...cv, defaultCv: false }
                )
            );

            setNotice("Đã đổi CV mặc định.");
        } catch (error) {
            setActionError(error);
        } finally {
            setWorking("");
        }
    }

    async function handleDownload(cv) {
        if (disabled) return;

        clearMessages();
        setWorking(`download:${cv.id}`);

        try {
            await downloadCv(cv.id, cv.fileName);
        } catch (error) {
            setActionError(error);
        } finally {
            setWorking("");
        }
    }

    return (
        <section className="profile-card cv-manager">
            <h2>CV của bạn</h2>

            <p className="profile-muted">
                Tải CV mới nhất và chọn bản mặc định để ứng tuyển.
            </p>

            <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                aria-label="Chọn file CV định dạng PDF"
                onChange={handleFileChange}
                disabled={disabled}
                hidden
            />

            <button
                type="button"
                className="cv-upload"
                disabled={disabled}
                onClick={() => fileInputRef.current?.click()}
            >
                <Upload size={30} aria-hidden="true" />

                <strong>
                    {working === "upload" ? "Đang tải CV lên…" : "Chọn tệp CV"}
                </strong>

                <span>PDF · Tối đa 5 MB</span>
            </button>

            <div aria-live="polite">
                {loading && (
                    <p className="profile-muted">Đang tải danh sách CV…</p>
                )}

                {notice && (
                    <p className="cv-success" role="status">
                        {notice}
                    </p>
                )}
            </div>

            {loadError && (
                <div className="cv-feedback">
                    <p className="profile-error" role="alert">
                        {loadError.message}
                    </p>

                    {!needLogin && (
                        <button
                            type="button"
                            className="cv-text-button"
                            onClick={() => {
                                clearMessages();
                                setRetry((value) => value + 1);
                            }}
                        >
                            Thử tải lại
                        </button>
                    )}
                </div>
            )}

            {actionError && (
                <p className="profile-error" role="alert">
                    {actionError.message}
                </p>
            )}

            {needLogin && (
                <Link to="/login" className="cv-text-button">
                    Đăng nhập để quản lý CV
                </Link>
            )}

            {!loading && !loadError && cvs.length === 0 && (
                <p className="cv-empty">
                    Bạn chưa có CV. CV đầu tiên tải lên sẽ tự được chọn làm
                    mặc định.
                </p>
            )}

            {!loading && !loadError && cvs.length > 0 && (
                <ul className="cv-list">
                    {cvs.map((cv) => (
                        <li key={cv.id} className="cv-item">
                            <div className="cv-item__heading">
                                <FileText
                                    size={22}
                                    className="cv-item__icon"
                                    aria-hidden="true"
                                />

                                <div className="cv-item__info">
                                    <strong title={cv.fileName}>
                                        {cv.fileName || "CV.pdf"}
                                    </strong>

                                    {cv.uploadedAt && (
                                        <span>
                                            Tải lên: {formatDate(cv.uploadedAt)}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="cv-item__actions">
                                {cv.defaultCv ? (
                                    <span className="cv-default">
                                        <Check size={14} aria-hidden="true" />
                                        Mặc định
                                    </span>
                                ) : (
                                    <button
                                        type="button"
                                        className="cv-text-button"
                                        disabled={disabled}
                                        onClick={() => handleSetDefault(cv.id)}
                                    >
                                        {working === `default:${cv.id}`
                                            ? "Đang chọn…"
                                            : "Đặt mặc định"}
                                    </button>
                                )}

                                <button
                                    type="button"
                                    className="cv-download"
                                    disabled={disabled}
                                    onClick={() => handleDownload(cv)}
                                    aria-label={`Tải xuống ${cv.fileName || "CV"}`}
                                >
                                    <Download size={15} aria-hidden="true" />
                                    {working === `download:${cv.id}`
                                        ? "Đang tải…"
                                        : "Tải xuống"}
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            <p className="cv-help">
                Khi ứng tuyển, hệ thống sẽ gửi CV mặc định của bạn.
            </p>
        </section>
    );
}