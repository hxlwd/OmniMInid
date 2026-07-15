import os

import pytest
from langgraph.checkpoint.base import empty_checkpoint
from pymongo import MongoClient

from omnimind.persistence.mongo import MongoRuntime


@pytest.mark.skipif("TEST_MONGODB_URI" not in os.environ, reason="需要测试 MongoDB")
def test_mongodb_saver_round_trip() -> None:
    client = MongoClient(os.environ["TEST_MONGODB_URI"])
    runtime = MongoRuntime(client=client, database_name="omnimind_test")
    config = {"configurable": {"thread_id": "platform-foundation-test"}}
    checkpoint = empty_checkpoint()
    metadata = {"source": "input", "step": -1, "parents": {}}

    try:
        stored_config = runtime.checkpointer.put(config, checkpoint, metadata, {})

        assert runtime.checkpointer.get(stored_config) == checkpoint
    finally:
        runtime.close()
