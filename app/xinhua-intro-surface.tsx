type XinhuaIntroSurfaceProps = {
  ready?: boolean;
  loadingMessage?: string;
  onBegin?: () => void;
};

export function XinhuaCoverMedia() {
  return (
    <picture className="intro-cover-picture">
      <source
        media="(max-width: 760px) and (orientation: portrait)"
        srcSet="/images/xinhua-plane-tree-cover-mobile.jpg"
      />
      <img
        className="intro-cover-image"
        src="/images/xinhua-plane-tree-cover-desktop.jpg"
        alt=""
        decoding="async"
        fetchPriority="high"
      />
    </picture>
  );
}

export function XinhuaIntroSurface({
  ready = false,
  loadingMessage = "正在搭起可行走的街区",
  onBegin,
}: XinhuaIntroSurfaceProps) {
  return (
    <section
      className={`intro-ui${ready ? " is-ready" : " is-loading"}`}
      aria-labelledby="intro-title"
      aria-busy={!ready}
    >
      <XinhuaCoverMedia />
      <div className="intro-copy">
        <span className="intro-kicker">SHANGHAI · XINHUA ROAD</span>
        <h1 id="intro-title">漫步新华路</h1>
        <p>沿着梧桐树影，走进新华路的故事</p>
      </div>

      <div className="intro-entry">
        {ready && onBegin ? (
          <button className="intro-start-button" type="button" onClick={onBegin}>
            出发
          </button>
        ) : (
          <div className="intro-loading-card" role="status" aria-live="polite">
            <span className="intro-loading-track" aria-hidden="true">
              <i />
            </span>
            <span className="intro-loading-copy">
              <b>正在铺开新华路</b>
              <small>{loadingMessage}</small>
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
