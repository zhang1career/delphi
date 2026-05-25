import { createElement, useMemo } from "react";
import { Platform, useWindowDimensions, View } from "react-native";
import RenderHtml, { type MixedStyleDeclaration } from "react-native-render-html";
import { sanitizeRichHtmlForDarkTheme } from "@/lib/richHtmlSanitize";

type Props = {
  html: string | null | undefined;
  className?: string;
};

/** Aligned with market detail copy: body slate-300, emphasis slate-100, links indigo-400. */
const RICH_HTML_COLORS = {
  body: "#cbd5e1",
  emphasis: "#f1f5f9",
  heading: "#f1f5f9",
  subheading: "#e2e8f0",
  link: "#818cf8",
  muted: "#94a3b8",
} as const;

const BASE_TEXT_STYLE: MixedStyleDeclaration = {
  color: RICH_HTML_COLORS.body,
  fontSize: 14,
  lineHeight: 22,
};

const TAGS_STYLES: Record<string, MixedStyleDeclaration> = {
  body: { ...BASE_TEXT_STYLE, margin: 0, padding: 0 },
  div: BASE_TEXT_STYLE,
  span: BASE_TEXT_STYLE,
  font: BASE_TEXT_STYLE,
  p: { ...BASE_TEXT_STYLE, marginTop: 0, marginBottom: 8 },
  a: { color: RICH_HTML_COLORS.link, textDecorationLine: "underline" },
  strong: { color: RICH_HTML_COLORS.emphasis, fontWeight: "600" },
  b: { color: RICH_HTML_COLORS.emphasis, fontWeight: "600" },
  em: { color: RICH_HTML_COLORS.body, fontStyle: "italic" },
  i: { color: RICH_HTML_COLORS.body, fontStyle: "italic" },
  h1: { color: RICH_HTML_COLORS.heading, fontSize: 18, fontWeight: "700", marginBottom: 8 },
  h2: { color: RICH_HTML_COLORS.heading, fontSize: 16, fontWeight: "700", marginBottom: 8 },
  h3: { color: RICH_HTML_COLORS.subheading, fontSize: 15, fontWeight: "600", marginBottom: 6 },
  h4: { color: RICH_HTML_COLORS.subheading, fontSize: 14, fontWeight: "600", marginBottom: 6 },
  ul: { ...BASE_TEXT_STYLE, marginTop: 0, marginBottom: 8, paddingLeft: 16 },
  ol: { ...BASE_TEXT_STYLE, marginTop: 0, marginBottom: 8, paddingLeft: 16 },
  li: { ...BASE_TEXT_STYLE, marginBottom: 4 },
  blockquote: {
    ...BASE_TEXT_STYLE,
    color: RICH_HTML_COLORS.muted,
    borderLeftWidth: 3,
    borderLeftColor: "#334155",
    paddingLeft: 12,
    marginBottom: 8,
  },
};

const WEB_SCOPED_CSS = `
.delphi-rich-html-root,
.delphi-rich-html-root p,
.delphi-rich-html-root div,
.delphi-rich-html-root span,
.delphi-rich-html-root li,
.delphi-rich-html-root font {
  color: ${RICH_HTML_COLORS.body} !important;
  font-size: 14px;
  line-height: 22px;
}
.delphi-rich-html-root a {
  color: ${RICH_HTML_COLORS.link} !important;
  text-decoration: underline;
}
.delphi-rich-html-root strong,
.delphi-rich-html-root b {
  color: ${RICH_HTML_COLORS.emphasis} !important;
  font-weight: 600;
}
.delphi-rich-html-root h1,
.delphi-rich-html-root h2 {
  color: ${RICH_HTML_COLORS.heading} !important;
}
.delphi-rich-html-root h3,
.delphi-rich-html-root h4 {
  color: ${RICH_HTML_COLORS.subheading} !important;
}
.delphi-rich-html-root blockquote {
  color: ${RICH_HTML_COLORS.muted} !important;
  border-left: 3px solid #334155;
  padding-left: 12px;
  margin: 0 0 8px;
}
.delphi-rich-html-root p {
  margin: 0 0 8px;
}
.delphi-rich-html-root p:last-child {
  margin-bottom: 0;
}
`;

export function RichHtmlBlock({ html, className }: Props) {
  const trimmed = typeof html === "string" ? html.trim() : "";
  const { width } = useWindowDimensions();
  const contentWidth = useMemo(() => Math.max(width - 32, 1), [width]);
  const sanitized = useMemo(
    () => (trimmed.length > 0 ? sanitizeRichHtmlForDarkTheme(trimmed) : ""),
    [trimmed],
  );

  if (sanitized.length === 0) {
    return null;
  }

  const shellClass = className ?? "px-4 mt-4";

  if (Platform.OS === "web") {
    return createElement(
      View,
      { className: shellClass },
      createElement(
        "div",
        { className: "delphi-rich-html-root" },
        createElement("style", {
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML: { __html: WEB_SCOPED_CSS },
        }),
        createElement("div", {
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML: { __html: sanitized },
        }),
      ),
    );
  }

  return (
    <View className={shellClass}>
      <RenderHtml
        contentWidth={contentWidth}
        source={{ html: sanitized }}
        baseStyle={BASE_TEXT_STYLE}
        tagsStyles={TAGS_STYLES}
        defaultTextProps={{ style: { color: RICH_HTML_COLORS.body, fontSize: 14, lineHeight: 22 } }}
        enableUserAgentStyles={false}
        enableCSSInlineProcessing={false}
      />
    </View>
  );
}
