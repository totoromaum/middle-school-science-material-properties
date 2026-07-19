export default function Home() {
  return (
    <main className="lesson-frame-shell">
      <iframe
        className="lesson-frame"
        src="/index.html"
        title="중2 과학 Ⅰ. 물질의 특성 인터랙티브 수업"
        allow="fullscreen"
      />
      <a className="lesson-frame-fallback" href="/index.html">
        수업 자료를 새 창에서 열기
      </a>
    </main>
  );
}
