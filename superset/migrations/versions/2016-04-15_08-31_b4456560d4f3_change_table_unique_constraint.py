# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
# KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License.
"""change_table_unique_constraint

Revision ID: b4456560d4f3
Revises: bb51420eaf83
Create Date: 2016-04-15 08:31:26.249591

"""

from alembic import op

# revision identifiers, used by Alembic.
revision = "b4456560d4f3"
down_revision = "bb51420eaf83"


def upgrade():
    try:
        # Trying since sqlite doesn't like constraints
        op.drop_constraint("tables_table_name_key", "tables", type_="unique")
        op.create_unique_constraint(
            "_customer_location_uc", "tables", ["database_id", "schema", "table_name"]
        )
    except Exception:  # noqa: S110
        pass


def downgrade():
    try:
        # Trying since sqlite doesn't like constraints
        op.drop_constraint("_customer_location_uc", "tables", type_="unique")
    except Exception:  # noqa: S110
        pass
