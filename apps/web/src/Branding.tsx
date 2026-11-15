import { Link, Outlet, useLocation } from "react-router-dom";

export function Brand() {
  return (
    <Link to="/" className="brand">
      <span className="brand-mark">
        <img
          src="/mascot/v3/portrait-original-redraw.png"
          alt=""
          width="64"
          height="64"
        />
      </span>
      <span className="brand-name">
        <strong>Karaoke Míque</strong>
        <small>Solta a voz, pede Bis</small>
      </span>
    </Link>
  );
}

export function SiteLayout() {
  const { pathname } = useLocation();
  const stage =
    /^\/stage\/[^/]+\/?$/.test(pathname) &&
    !/^\/stage\/(pair|tv)\/?$/.test(pathname);
  if (stage) return <Outlet />;
  return (
    <div
      className={`site-frame${pathname.startsWith("/r/") ? " room-page-frame" : ""}`}
    >
      <div className="site-page">
        <Outlet />
      </div>
      <footer className="site-footer">
        <div>
          <strong>Solta a voz, pede Bis</strong>
          <p>
            © {new Date().getFullYear()} Karaoke Míque. Todos os direitos
            reservados.
          </p>
        </div>
        <span>Vídeos do YouTube · GIFs do GIPHY</span>
      </footer>
    </div>
  );
}
