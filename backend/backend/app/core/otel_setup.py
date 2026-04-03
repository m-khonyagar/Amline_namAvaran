"""OpenTelemetry for FastAPI — enabled when OTEL_EXPORTER_OTLP_ENDPOINT is set."""

from __future__ import annotations

import logging
import os

from fastapi import FastAPI

log = logging.getLogger(__name__)


def register_opentelemetry(app: FastAPI) -> None:
    endpoint = (os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT") or "").strip()
    if not endpoint:
        return
    try:
        from opentelemetry import trace
        from opentelemetry.exporter.otlp.proto.http.trace_exporter import (
            OTLPSpanExporter,
        )
        from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
        from opentelemetry.sdk.resources import Resource
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor

        service = os.getenv("OTEL_SERVICE_NAME", "amline-api")
        provider = TracerProvider(resource=Resource.create({"service.name": service}))
        trace.set_tracer_provider(provider)
        exporter = OTLPSpanExporter(endpoint=endpoint.rstrip("/") + "/v1/traces")
        provider.add_span_processor(BatchSpanProcessor(exporter))
        FastAPIInstrumentor.instrument_app(app)
        log.info("OpenTelemetry tracing enabled → %s", endpoint)
    except Exception as e:  # noqa: BLE001
        log.warning("OpenTelemetry setup skipped: %s", e)
