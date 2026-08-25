from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from .database import get_db

training_bp = Blueprint('training', __name__)


@training_bp.post('/train')
@jwt_required()
def train_model():
    user_id = get_jwt_identity()
    with get_db() as (cursor, conn):
        cursor.execute("SELECT is_admin FROM users WHERE id = %s", (user_id,))
        row = cursor.fetchone()
    if not row or not row.get("is_admin"):
        return jsonify(error="Acesso restrito."), 403

    from services.predictive_maintenance import MaintenancePredictor
    predictor = MaintenancePredictor()
    if predictor.train():
        return jsonify(message="Training completed successfully."), 200
    else:
        return jsonify(message="Not enough historical records to train the models."), 400
