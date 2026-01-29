import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.metadata.metadata import router as metadata_router
from api.channels.channels import router as channels_router
from api.ecus.ecus import router as ecu_router
from api.messages.messages import router as messages_router
from api.signals.signals import router as signals_router
from api.attributes.attributes import router as attributes_router
from api.can_dbc.can_dbc import router as dbc_router
from db.database import engine, Base

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(metadata_router)
app.include_router(channels_router)
app.include_router(ecu_router)
app.include_router(messages_router)
app.include_router(signals_router)
app.include_router(attributes_router)
app.include_router(dbc_router)

if __name__ == "__main__":
    uvicorn.run("main:app", reload=True, )
