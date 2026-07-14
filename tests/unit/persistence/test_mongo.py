from unittest.mock import MagicMock

from langgraph.checkpoint.mongodb import MongoDBSaver

from omnimind.persistence.mongo import MongoRuntime


def test_runtime_uses_named_database() -> None:
    client = MagicMock()

    runtime = MongoRuntime(client=client, database_name="omnimind_test")

    assert runtime.database is client["omnimind_test"]


def test_runtime_reuses_checkpointer_with_same_client_and_database() -> None:
    client = MagicMock()
    runtime = MongoRuntime(client=client, database_name="omnimind_test")

    first = runtime.checkpointer

    assert isinstance(first, MongoDBSaver)
    assert first is runtime.checkpointer
    assert first.client is client
    assert first.db is client["omnimind_test"]


def test_ensure_indexes_creates_user_scoped_business_indexes() -> None:
    client = MagicMock()
    runtime = MongoRuntime(client=client, database_name="omnimind_test")

    runtime.ensure_indexes()

    database = client["omnimind_test"]
    database.study_tasks.create_index.assert_called_once()
    database.notifications.create_index.assert_called_once()
    database.ingestion_jobs.create_index.assert_called_once()
    database.learning_events.create_index.assert_called_once()


def test_close_releases_mongo_client() -> None:
    client = MagicMock()

    MongoRuntime(client=client, database_name="omnimind_test").close()

    client.close.assert_called_once_with()
