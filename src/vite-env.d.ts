// Vite の `?inline` で取り込んだフォントは、data URI の文字列になる
declare module '*.woff2?inline' {
  const dataUri: string;
  export default dataUri;
}
