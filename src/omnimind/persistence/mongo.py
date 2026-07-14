from dataclasses import dataclass, field
from typing import Any

from langgraph.checkpoint.mongodb import MongoDBSaver
from pymongo import ASCENDING, DESCENDING, MongoClient
from pymongo.database import Database

MongoDocument = dict[str, Any]


@dataclass(slots=True)
class MongoRuntime:
    client: MongoClient[MongoDocument]
    database_name: str
    _checkpointer: MongoDBSaver | None = field(default=None, init=False, repr=False)

    @classmethod
    def from_uri(cls, uri: str, database_name: str) -> "MongoRuntime":
        return cls(
            client=MongoClient(uri, appname="omnimind"),
            database_name=database_name,
        )

    @property
    def database(self) -> Database[MongoDocument]:
        return self.client[self.database_name]

    @property
    def checkpointer(self) -> MongoDBSaver:
        if self._checkpointer is None:
            self._checkpointer = MongoDBSaver(self.client, db_name=self.database_name)
        return self._checkpointer

    def ensure_indexes(self) -> None:
        self.database.study_tasks.create_index(
            [("user_id", ASCENDING), ("plan_id", ASCENDING), ("position", ASCENDING)],
            unique=True,
        )
        self.database.notifications.create_index(
            [("user_id", ASCENDING), ("status", ASCENDING), ("due_at", ASCENDING)]
        )
        self.database.ingestion_jobs.create_index(
            [("status", ASCENDING), ("lease_until", ASCENDING), ("created_at", ASCENDING)]
        )
        self.database.learning_events.create_index(
            [("user_id", ASCENDING), ("created_at", DESCENDING)]
        )

    def ping(self) -> None:
        self.client.admin.command("ping")

    def close(self) -> None:
        self.client.close()
