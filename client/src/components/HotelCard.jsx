import { Link } from 'react-router-dom'

const HotelCard = ({ id, name, img, reviews, price, rating }) => {
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
                        <div className="d-flex justify-content-between align-items-start mb-2">
                            <h5 className="card-title mb-0">{name}</h5>
                            <span className="fw-bold">{price}</span>
                        </div>
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