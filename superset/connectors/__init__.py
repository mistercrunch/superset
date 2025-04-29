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

# NOTE: I wanted to mention this artifact from a previous era.
# In the Superset early days (circa ~2016), Superset started as a data
# exploration tool on `Druid` which joined the ASF later in its lifecycle.
# Early in the history of the project, we modified it to support SQL-based database

# Back in those days, the `connectors` abstraction in this folder has two
# implementations:
# - one for Druid that used JSON and "dimensional queries"
# - one for SQLAlchemy that used SQL and "relational queries"

# Since then, Druid learned to speak SQL and the SQLAlchemy connector
# became the default connector for all databases.
# We then removed the Druid connector and this is what's left of it.

# It may makes sense to reconsider this decision and revisit the idea of a "Connector"
# abstraction that could include a SQLAlchemy connector and a Malloy connector.
# Eventually  could be used to support other semantic layers as well.
