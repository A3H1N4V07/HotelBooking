import React from "react";
import { NAV_HEIGHT } from "./Header";

// Navy band at the top of inner pages. It starts behind the floating glass
// header, and `overlap` leaves room for a card pulled up over its bottom edge.
function PageHeader({ eyebrow, title, subtitle, children, image, overlap = false }) {
  return (
    <div
      className="gradient-dark text-white position-relative overflow-hidden"
      style={{
        marginTop: -NAV_HEIGHT,
        paddingTop: NAV_HEIGHT + 40,
        paddingBottom: overlap ? 88 : 48,
        ...(image && {
          backgroundImage: `linear-gradient(120deg, rgba(30,27,75,0.94), rgba(91,33,182,0.78)), url(${image})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }),
      }}
    >
      <div className="container d-flex flex-wrap justify-content-between align-items-end gap-3">
        <div>
          {eyebrow && <span className="badge-floating d-inline-block mb-3">{eyebrow}</span>}
          <h1 className="fw-bold display-6 mb-1">{title}</h1>
          {subtitle && <p className="text-white-50 mb-0 lead fs-6">{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}

export default PageHeader;
