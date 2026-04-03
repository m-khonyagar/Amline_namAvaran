"""ML-ready registry: swap rule engines for ONNX/Torch jobs without route churn."""

from __future__ import annotations

import os
from typing import Any


def describe_ml_stack() -> dict[str, Any]:
    return {
        "matching_backend": os.getenv("AMLINE_ML_MATCHING_BACKEND", "rule_based"),
        "pricing_backend": os.getenv("AMLINE_ML_PRICING_BACKEND", "rule_based"),
        "model_artifact_uri": os.getenv("AMLINE_ML_MODEL_URI", ""),
        "training_pipeline": os.getenv(
            "AMLINE_ML_TRAINING_PIPELINE", "placeholder_batch_export_to_parquet"
        ),
        "notes": "Set AMLINE_ML_* to wire inference services; routes stay on /api/v1/ai/*",
    }
