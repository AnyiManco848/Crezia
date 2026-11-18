const BASE = import.meta.env.BASE_URL;

// Light logo: the approved original. Dark logo: PROVISIONAL variant derived for dark backgrounds, not
// official (see docs/generated/especificacion-ui.md, section 2). The theme tokens show one or the other.
export function Logo() {
  return (
    <span className="logo">
      <img className="l-light" src={`${BASE}logo-crezia.jpg`} alt="" />
      <img className="l-dark" src={`${BASE}logo-crezia-oscuro.png`} alt="" />
    </span>
  );
}

export function Brand() {
  return (
    <div className="brand-row">
      <Logo />
      <span className="wordmark">CREZIA</span>
    </div>
  );
}
