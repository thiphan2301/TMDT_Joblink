from pathlib import Path

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from sentence_transformers import SentenceTransformer
import joblib

MODEL_NAME = "intfloat/multilingual-e5-small"
MODEL_PATH = Path(__file__).resolve().with_name("clf.joblib")
LABELS = {"negative", "neutral", "positive"}

app = FastAPI(title="JobLink Sentiment Service")
enc = SentenceTransformer(MODEL_NAME)
clf = joblib.load(MODEL_PATH)

if clf.n_features_in_ != 384:
    raise RuntimeError(
        f"Classifier expects {clf.n_features_in_} features; "
        "multilingual-e5-small produces 384."
    )
if set(clf.classes_) != LABELS:
    raise RuntimeError(f"Classifier classes must be exactly {sorted(LABELS)}.")


class Req(BaseModel):
    text: str = Field(min_length=1, max_length=5000)


class BatchReq(BaseModel):
    texts: list[str] = Field(min_length=1, max_length=100)


def classify(texts: list[str]) -> list[dict[str, str | float]]:
    clean_texts = [text.strip() for text in texts]
    if any(not text for text in clean_texts):
        raise ValueError("Text must not be blank.")

    vectors = enc.encode(
        ["query: " + text for text in clean_texts],
        normalize_embeddings=True,
    )
    probabilities = clf.predict_proba(vectors)
    predictions = []
    for row in probabilities:
        index = int(row.argmax())
        predictions.append({
            "label": str(clf.classes_[index]),
            "confidence": float(row[index]),
        })
    return predictions


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/predict")
def predict(req: Req) -> dict[str, str | float]:
    try:
        return classify([req.text])[0]
    except ValueError as exception:
        raise HTTPException(status_code=422, detail=str(exception)) from exception


@app.post("/predict/batch")
def predict_batch(req: BatchReq) -> list[dict[str, str | float]]:
    try:
        return classify(req.texts)
    except ValueError as exception:
        raise HTTPException(status_code=422, detail=str(exception)) from exception