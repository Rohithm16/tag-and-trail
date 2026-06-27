from fastapi import FastAPI

from app.api.routes.health import router as health_router

app = FastAPI(
    title="Tag & Track API",
    version="1.0.0"
)

app.include_router(health_router)


@app.get("/")
def root():
    return {
        "message": "Welcome to Tag & Track!"
    }