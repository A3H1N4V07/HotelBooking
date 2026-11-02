import { Link } from 'react-router-dom'
import { ArrowRightIcon, MapPinIcon, StarIcon } from './Icons'

// One hotel in a grid (hotel list and home page).
// `highlighted`: the voice assistant just answered about this hotel.
const HotelCard = ({
    id,
    name,
    img,
    price,
    rating,
    city,
    category,
    distance,
    amenities = [],
    highlighted = false,
    className = "col-md-6 col-xl-4",
}) => {
    return (
        <div className={className}>
            <Link to={`/hotels/${id}/`} className="text-decoration-none text-dark d-block h-100">
                <div
                    className={`card h-100 rounded-4 overflow-hidden shadow-sm hover-lift ${highlighted ? "border border-3 border-warning" : "border-0"}`}
                >
                    <div className="position-relative">
                        <img
                            src={img}
                            alt={name}
                            className="w-100"
                            style={{ height: 220, objectFit: "cover" }}
                        />
                        {category && (
                            <span className="badge-floating position-absolute top-0 start-0 m-3 py-1 px-3 small">
                                {category}
                            </span>
                        )}
                        {rating != null && (
                            <span className="badge rounded-pill bg-white text-dark shadow-sm position-absolute top-0 end-0 m-3 px-2 py-1 d-inline-flex align-items-center gap-1">
                                <StarIcon size={13} className="text-warning" /> {rating}
                            </span>
                        )}
                    </div>

                    <div className="card-body p-4 d-flex flex-column">
                        <h5 className="card-title fw-bold mb-1">{name}</h5>

                        {(city || distance) && (
                            <div className="small text-muted mb-2 d-flex align-items-start gap-1">
                                <MapPinIcon size={14} className="mt-1" />
                                <span>{[city, distance].filter(Boolean).join(" · ")}</span>
                            </div>
                        )}

                        {amenities.length > 0 && (
                            <div className="d-flex flex-wrap gap-1 mb-3">
                                {amenities.map((label) => (
                                    <span key={label} className="badge rounded-pill text-bg-light border fw-normal text-secondary">
                                        {label}
                                    </span>
                                ))}
                            </div>
                        )}

                        <div className="mt-auto pt-3 border-top d-flex justify-content-between align-items-center">
                            <span className="fw-bold fs-5">{price}<small className="text-muted fw-normal fs-6"> / night</small></span>
                            <span className="btn btn-dark btn-sm rounded-circle p-0 d-inline-flex align-items-center justify-content-center" style={{ width: 34, height: 34 }} aria-hidden="true">
                                <ArrowRightIcon size={16} />
                            </span>
                        </div>
                    </div>
                </div>
            </Link>
        </div>
    )
}

export default HotelCard
