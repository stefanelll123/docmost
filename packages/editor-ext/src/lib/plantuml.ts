import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";

export interface PlantumlOptions {
  HTMLAttributes: Record<string, any>;
  view: any;
}

export interface PlantumlAttributes {
  code?: string;
  mode?: "split" | "code" | "preview";
  width?: string;
  align?: string;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    plantuml: {
      setPlantuml: (attributes?: PlantumlAttributes) => ReturnType;
    };
  }
}

export const DEFAULT_PLANTUML_CODE = "@startuml\nAlice -> Bob: Hello\n@enduml";

export const Plantuml = Node.create<PlantumlOptions>({
  name: "plantuml",
  inline: false,
  group: "block",
  isolating: true,
  atom: true,
  defining: true,
  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {},
      view: null,
    };
  },

  addAttributes() {
    return {
      code: {
        default: DEFAULT_PLANTUML_CODE,
        parseHTML: (element) =>
          element.getAttribute("data-code") ??
          element.querySelector("code")?.textContent ??
          "",
        renderHTML: (attributes: PlantumlAttributes) => ({
          "data-code": attributes.code,
        }),
      },
      mode: {
        default: "split",
        parseHTML: (element) => element.getAttribute("data-mode") ?? "split",
        renderHTML: (attributes: PlantumlAttributes) => ({
          "data-mode": attributes.mode,
        }),
      },
      width: {
        default: "100%",
        parseHTML: (element) => element.getAttribute("data-width"),
        renderHTML: (attributes: PlantumlAttributes) => ({
          "data-width": attributes.width,
        }),
      },
      align: {
        default: "center",
        parseHTML: (element) => element.getAttribute("data-align"),
        renderHTML: (attributes: PlantumlAttributes) => ({
          "data-align": attributes.align,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: `div[data-type="${this.name}"]`,
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(
        { "data-type": this.name },
        this.options.HTMLAttributes,
        HTMLAttributes,
      ),
      ["pre", ["code", { class: "language-plantuml" }, node.attrs.code ?? ""]],
    ];
  },

  addCommands() {
    return {
      setPlantuml:
        (attrs?: PlantumlAttributes) =>
        ({ commands }) => {
          return commands.insertContent({
            type: "plantuml",
            attrs,
          });
        },
    };
  },

  addNodeView() {
    this.editor.isInitialized = true;

    return ReactNodeViewRenderer(this.options.view);
  },
});
