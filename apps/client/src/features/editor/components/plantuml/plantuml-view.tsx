import { NodeViewProps, NodeViewWrapper } from "@tiptap/react";
import { useEffect, useRef, useState } from "react";
import {
  ActionIcon,
  CopyButton,
  Modal,
  SegmentedControl,
  Text,
  Tooltip,
} from "@mantine/core";
import { useDebouncedValue, useDisclosure } from "@mantine/hooks";
import { IconCheck, IconCopy, IconDownload } from "@tabler/icons-react";
import { saveAs } from "file-saver";
import { useTranslation } from "react-i18next";
import DOMPurify from "dompurify";
import api from "@/lib/api-client";
import classes from "./plantuml-view.module.css";

type Mode = "split" | "code" | "preview";

// the sanitized markup is HTML-serialized, so re-serialize it as well-formed XML before using it as an image
function toStandaloneSvg(svg: string): {
  xml: string;
  width: number;
  height: number;
} {
  const doc = new DOMParser().parseFromString(svg, "text/html");
  const el = doc.querySelector("svg");
  if (!el) throw new Error("Invalid diagram");

  const viewBox = el
    .getAttribute("viewBox")
    ?.split(/[\s,]+/)
    .map(Number);
  const width =
    parseFloat(el.getAttribute("width") ?? "") || viewBox?.[2] || 800;
  const height =
    parseFloat(el.getAttribute("height") ?? "") || viewBox?.[3] || 600;

  el.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  el.setAttribute("width", String(width));
  el.setAttribute("height", String(height));
  el.removeAttribute("style");

  return { xml: new XMLSerializer().serializeToString(el), width, height };
}

function svgToPngBlob(svg: string): Promise<Blob> {
  const { xml, width, height } = toStandaloneSvg(svg);
  const scale = 2;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas not supported"));
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Export failed"))),
        "image/png",
      );
    };
    img.onerror = () => reject(new Error("Failed to load diagram image"));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
  });
}

async function renderPlantuml(code: string): Promise<string> {
  const req = await api.post<{ svg: string }>("/plantuml/render", { code });
  return DOMPurify.sanitize(req.data.svg, { USE_PROFILES: { svg: true } });
}

export default function PlantumlView(props: NodeViewProps) {
  const { t } = useTranslation();
  const { node, updateAttributes, editor, selected } = props;
  const isEditable = editor.isEditable;
  const nodeCode: string = node.attrs.code ?? "";
  const nodeMode: Mode = node.attrs.mode ?? "split";

  const [draft, setDraft] = useState(nodeCode);
  const [showCode, setShowCode] = useState(false);
  const [svg, setSvg] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fullscreen, { open: openFullscreen, close: closeFullscreen }] =
    useDisclosure(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // pick up remote changes unless the user is typing here
  useEffect(() => {
    if (document.activeElement !== textareaRef.current) {
      setDraft(nodeCode);
    }
  }, [nodeCode]);

  const code = isEditable ? draft : nodeCode;
  const [debouncedCode] = useDebouncedValue(code, 500);

  const mode: Mode = isEditable ? nodeMode : showCode ? "code" : "preview";
  const needsPreview = mode !== "code";

  useEffect(() => {
    if (!needsPreview) return;

    let cancelled = false;
    setLoading(true);
    renderPlantuml(debouncedCode)
      .then((result) => {
        if (cancelled) return;
        setSvg(result);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setSvg("");
        setError(
          err?.response?.data?.message ??
            t("Failed to render PlantUML diagram"),
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedCode, needsPreview]);

  const handleChange = (value: string) => {
    setDraft(value);
    updateAttributes({ code: value });
  };

  const handleDownload = async () => {
    if (!svg) return;
    try {
      saveAs(await svgToPngBlob(svg), "diagram.png");
    } catch (err) {
      console.error(err);
    }
  };

  const preview = (
    <div className={`${classes.pane} ${classes.preview}`}>
      {error ? (
        <Text c="red" size="sm" className={classes.message}>
          {error}
        </Text>
      ) : svg ? (
        <div
          style={{ opacity: loading ? 0.6 : 1 }}
          onDoubleClick={openFullscreen}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <Text c="dimmed" size="sm" className={classes.message}>
          {loading ? t("Rendering diagram...") : t("Empty diagram")}
        </Text>
      )}
    </div>
  );

  const codePane = isEditable ? (
    <div className={classes.pane}>
      <textarea
        ref={textareaRef}
        className={classes.code}
        value={draft}
        spellCheck={false}
        placeholder="@startuml&#10;Alice -> Bob: Hello&#10;@enduml"
        onChange={(event) => handleChange(event.target.value)}
      />
    </div>
  ) : (
    <div className={classes.pane}>
      <pre className={classes.codeReadOnly}>{nodeCode}</pre>
    </div>
  );

  return (
    <NodeViewWrapper data-drag-handle>
      <div
        className={classes.container}
        style={
          selected
            ? { outline: "2px solid var(--mantine-color-blue-5)" }
            : undefined
        }
        contentEditable={false}
      >
        <div className={classes.toolbar}>
          <Text size="xs" fw={600} c="dimmed">
            PlantUML
          </Text>

          {isEditable ? (
            <SegmentedControl
              size="xs"
              value={nodeMode}
              onChange={(value) => updateAttributes({ mode: value })}
              data={[
                { label: t("Split"), value: "split" },
                { label: t("Code"), value: "code" },
                { label: t("Preview"), value: "preview" },
              ]}
            />
          ) : (
            <SegmentedControl
              size="xs"
              value={showCode ? "code" : "preview"}
              onChange={(value) => setShowCode(value === "code")}
              data={[
                { label: t("Diagram"), value: "preview" },
                { label: t("Code"), value: "code" },
              ]}
            />
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <CopyButton value={nodeCode} timeout={2000}>
              {({ copied, copy }) => (
                <Tooltip label={copied ? t("Copied") : t("Copy code")}>
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    size="sm"
                    onClick={copy}
                  >
                    {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                  </ActionIcon>
                </Tooltip>
              )}
            </CopyButton>

            <Tooltip label={t("Download as image")}>
              <ActionIcon
                variant="subtle"
                color="gray"
                size="sm"
                disabled={!svg}
                onClick={handleDownload}
              >
                <IconDownload size={14} />
              </ActionIcon>
            </Tooltip>
          </div>
        </div>

        <div className={classes.panes}>
          {(mode === "split" || mode === "code") && codePane}
          {(mode === "split" || mode === "preview") && preview}
        </div>
      </div>

      <Modal
        opened={fullscreen}
        onClose={closeFullscreen}
        fullScreen
        title="PlantUML"
        zIndex={400}
      >
        <div
          className={classes.fullscreen}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </Modal>
    </NodeViewWrapper>
  );
}
