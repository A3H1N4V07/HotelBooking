import { Link } from 'react-router-dom'

const HotelCard = ({ id, name, img, reviews, price, rating, distance, amenities = [] }) => {
    return (
        <div className="col-md-4 col-sm-6 mb-4">
            <Link to={`/hotels/${id}/`} className="text-decoration-none text-dark">
                <div className="card border-0 shadow-sm h-100 hover-lift">
                    <img
                        src={img}
                        alt={name}
                        className="card-img-top"
                        style={{ height: "200px", objectFit: "cover" }}
                    />
                    <div className="card-body">
                        <div className="d-flex justify-content-between align-items-start mb-2 gap-2">
                            <h5 className="card-title mb-0">{name}</h5>
                            <span className="fw-bold text-nowrap">{price}</span>
                        </div>
                        {distance && (
                            <div className="small text-muted mb-1">📍 {distance}</div>
                        )}
                        {amenities.length > 0 && (
                            <div className="small text-muted mb-2">{amenities.join(" · ")}</div>
                        )}
                        <div className="d-flex justify-content-between text-muted small">
                            <span>⭐ {rating}</span>
                            <span>{reviews} reviews</span>
                        </div>
                    </div>
                </div>
            </Link>
        </div>
    )
}

export default HotelCard
