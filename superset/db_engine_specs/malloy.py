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


"""
NOTE: this class could encapsulate all of the Malloy-specific stuff
it requires having a dbapi-copatible connection and SQLAlchemy dialect
both of which are pretty easy to implement / mock, we've created many for oddball
databases in the past that have limited SQL support...
-------
the base class is in superset/db_engine_specs/base.py, and as it is today, it allows
all sorts of hooks (methods, class-level props, ...) to be overridden and handle things
in custom ways, stuff like
- get_table_names
- get_schema_names
- get_columns
- data fetching, low level cursor handling, ...
- time-grain aggregate generation (think DATE_TRUNC)

the general assumption here is that we're dealing with a SQL-speaking database, but
could be extended to support other types of engines (e.g. NoSQL, etc.), or just as
a general placeholder for any routines that are Malloy-specific. This allows
compartmentalizing all the Malloy-specific stuff in one place, and not having
to write `if engine.name == "malloy"` everywhere in the codebase.

note that the SQL generation logic lives elsewhere in the codebase (will try and
give some pointers to that later), and is not part of this class. But we
could add branching in the codebase that would allow us to say something like
```python
if not database.db_engine_spec.engine.supports_sql:
    database.db_engine_spec.fetch_data_without_using_sql(dimensional_query_definition)
else:
    # follow current code path ...

```
"""

from superset.db_engine_specs.base import BaseEngineSpec


class MalloyEngineSpec(BaseEngineSpec):
    engine = "malloy"
    engine_name = "Malloy"
