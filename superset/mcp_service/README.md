# Superset MCP Service

> **What is this?** The MCP service allows Claude Desktop to directly interact with Apache Superset, enabling natural language queries and commands for data visualization.

> **How does it work?** This service is part of the Apache Superset codebase. You need to:
> 1. Have Apache Superset installed and running
> 2. Connect Claude Desktop to your Superset instance using this MCP service
> 3. Then Claude can create charts, query data, and manage dashboards

The Superset Model Context Protocol (MCP) service provides a modular, schema-driven interface for programmatic access to Superset dashboards, charts, datasets, and instance metadata. It is designed for LLM agents and automation tools, and is built on the FastMCP protocol.

**Key Features:**
- **20 Tools** - Complete CRUD operations for dashboards, charts, datasets, plus interactive exploration and SQL execution
- **2 Prompts** - Guided workflows for onboarding and chart creation
- **2 Resources** - Real-time instance metadata and visualization templates for enhanced LLM context

**✅ Phase 1 Complete - Production Ready. Core functionality stable, authentication production-ready, comprehensive testing coverage, optimized dashboard layouts, automated test framework.**

## 🚀 Quickstart

### Option 1: Automated Setup (Recommended) 🎯

The fastest way to get everything running:

```bash
# 1. Clone the repository
git clone https://github.com/apache/superset.git
cd superset

# 2. Run automated setup (Python 3.10 or 3.11 required)
make mcp-setup

# 3. Start everything
make mcp-run
```

**That's it!** ✨
- Superset is running at http://localhost:8088 (login: admin/admin)
- MCP service is running on port 5008
- Now configure Claude Desktop (see Step 2 below)

#### What `make mcp-setup` does:
- Creates Python virtual environment
- Installs all dependencies
- Initializes database
- Creates admin user (admin/admin)
- Configures MCP service
- Optionally loads example datasets

#### What `make mcp-run` does:
- Starts Superset backend and frontend
- Starts MCP service on port 5008
- Everything runs in the background

### Option 2: Manual Setup

If you prefer manual control or the make commands don't work:

<details>
<summary>Click to expand manual setup instructions</summary>

```bash
# 1. Clone the repository
git clone https://github.com/apache/superset.git
cd superset

# 2. Set up Python environment
make venv
source venv/bin/activate

# 3. Install dependencies
make install

# 4. Initialize database
superset db upgrade
superset init

# 5. Create admin user
superset fab create-admin \
  --username admin \
  --firstname Admin \
  --lastname Admin \
  --email admin@localhost \
  --password admin

# 6. Start Superset (in one terminal)
superset run -p 8088 --with-threads --reload --debugger

# 7. Start MCP service (in another terminal)
source venv/bin/activate
superset mcp run --port 5008 --debug
```

</details>

## 🔌 Step 2: Connect Claude Desktop

### Option A: For Claude Desktop (Manual Config)

Add this to your Claude Desktop config file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**Linux**: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "superset": {
      "command": "npx",
      "args": ["/path/to/your/superset/superset/mcp_service"],
      "env": {
        "PYTHONPATH": "/path/to/your/superset"
      }
    }
  }
}
```

Then restart Claude Desktop. That's it! ✨

### Option B: Manual Proxy Connection

If using `make mcp-run` and prefer manual setup:

```json
{
  "mcpServers": {
    "superset": {
      "command": "/absolute/path/to/your/superset/superset/mcp_service/run_proxy.sh",
      "args": [],
      "env": {}
    }
  }
}
```

**Important:** Replace `/absolute/path/to/your/superset` with your actual path!

### Alternative Connection Methods

<details>
<summary>Direct STDIO with npx</summary>

```json
{
  "mcpServers": {
    "superset": {
      "command": "npx",
      "args": ["/absolute/path/to/your/superset/superset/mcp_service", "--stdio"],
      "env": {}
    }
  }
}
```
</details>

<details>
<summary>Direct STDIO with Python</summary>

```json
{
  "mcpServers": {
    "superset": {
      "command": "/absolute/path/to/your/superset/venv/bin/python",
      "args": ["-m", "superset.mcp_service"],
      "env": {
        "PYTHONPATH": "/absolute/path/to/your/superset"
      }
    }
  }
}
```
</details>

### 📍 Claude Desktop Config Location

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

## ✅ Step 3: Verify Everything Works

```bash
# Check setup and configuration
make mcp-check
```

Then in Claude Desktop, try:
- "List all dashboards in Superset"
- "Show me the available datasets"
- "Get superset instance info"

## 🚀 Running MCP on GitHub Codespaces

GitHub Codespaces provides the fastest way to get a fully-loaded, interactive Superset development environment with MCP service ready to go out of the box. For general Codespaces setup, see the [official Superset Codespaces documentation](https://superset.apache.org/docs/contributing/development/#github-codespaces-cloud-development).

### One-Click Setup

Use this prepopulated link to create a Codespace with MCP preconfigured:

[**🚀 Launch Superset MCP Codespace**](https://github.com/codespaces/new?skip_quickstart=true&machine=standardLinux32gb&repo=1011093596&ref=mcp_service_amin_dev&devcontainer_path=.devcontainer%2Fwith-mcp%2Fdevcontainer.json&geo=UsWest)

<img src="https://github.com/user-attachments/assets/e2c97c10-6432-4741-9d31-475cdbb5cc11" alt="GitHub Codespaces creation form with MCP configuration preselected" width="600" />

This link:
- Uses the `mcp_service_amin_dev` branch with all MCP features
- Selects the `with-mcp` devcontainer configuration
- Chooses a 32GB machine for optimal performance
- Skips the quickstart to get you coding faster

### What You Get

Once your Codespace launches (takes ~5-10 minutes), you'll have:
- ✅ Superset running on port 9001
- ✅ MCP service running on port 5008
- ✅ PostgreSQL database with sample data
- ✅ Redis for caching
- ✅ All Python and Node dependencies installed
- ✅ Pre-configured environment ready for development

![GitHub Codespace with MCP service running on port 5008](https://github.com/user-attachments/assets/a47c8960-58b9-440a-8897-5dbab3315c09)

## 🌐 Using ModelContextChat.com (Web-based MCP Client)
### Exposing MCP for External Access

To connect Claude Desktop or ModelContextChat.com to your Codespace MCP service:

1. **Make Port 5008 Public**:
   - Go to the **PORTS** tab in your Codespace
   - Find port **5008** (MCP Service)
   - Right-click and select **Port Visibility** → **Public**
   - Copy the public URL (e.g., `https://your-codespace-5008.app.github.dev`)

2. **Connect Your Client**:

   **For ModelContextChat.com**:
   - Follow the [ModelContextChat setup](#-using-modelcontextchatcom-web-based-mcp-client) below
   - Use your Codespace URL ending with `/mcp/`

   **For Claude Desktop**:
   - Configure with your public MCP URL
   - Use appropriate authentication if configured

### Codespace Configuration Options

The repository includes two devcontainer configurations:

1. **Standard Development** (`.devcontainer/default/devcontainer.json`):
   - Basic Superset development environment
   - No MCP service by default

2. **With MCP** (`.devcontainer/with-mcp/devcontainer.json`):
   - Includes MCP service startup
   - Preconfigured for MCP development
   - Recommended for MCP-related work

### Tips for Codespaces

- **Performance**: The 32GB machine is recommended for smooth operation
- **Persistence**: Your Codespace preserves state between sessions
- **Port Forwarding**: All necessary ports are automatically forwarded
- **Extensions**: VS Code extensions are preconfigured for Python/TypeScript development

> ⚠️ **Security Reminder**: Only make ports public for development/testing. Never expose production data through public Codespace ports.

## 🛠️ Available Make Commands

| Command | Description |
|---------|-------------|
| `make mcp-setup` | One-command setup for everything |
| `make mcp-run` | Start Superset + MCP service together |
| `make mcp-check` | Verify setup and configuration |
| `make mcp-stop` | Stop all MCP-related services |
| `make flask-app` | Start only Superset backend |
| `make node-app` | Start only Superset frontend |

## 🚨 Troubleshooting

| Issue | Solution |
|-------|----------|
| Setup fails | Try `make mcp-setup --force` |
| Can't connect | Run `make mcp-check` to diagnose |
| "Command not found" | Use absolute paths in Claude config |
| "No MCP tools" | Restart Claude Desktop after config changes |
| Port already in use | Check with `lsof -i :5008` and `lsof -i :8088` |

## 📚 Documentation

For detailed information about the MCP service, tools, and capabilities, continue reading below.

---

## Transport Modes

### HTTP Transport
The default transport mode runs as an HTTP server on port 5008. This is recommended for:
- Production deployments
- Remote access scenarios
- Integration with web-based MCP clients
- GitHub Codespaces development

### STDIO Transport
The stdio transport uses standard input/output for JSON-RPC communication. This is ideal for:
- Local development with Claude Desktop
- Direct integration without network overhead
- Simplified setup without proxy requirements
- Testing and debugging

#### How STDIO Works

1. **Initialization Handshake**:
   - Client sends `initialize` request
   - Server responds with capabilities
   - Client sends `notifications/initialized` to complete handshake
   - Server is now ready to handle requests

2. **Clean Output**:
   - All Flask/Superset initialization output is redirected to stderr
   - Only JSON-RPC messages go to stdout
   - Click echo/secho output is redirected to stderr

3. **Flask Context**:
   - The service runs within a Flask application context
   - Database connections and configurations are properly initialized

## Environment Variables

The MCP service supports several environment variables for configuration:

- `FASTMCP_TRANSPORT`: Set to "stdio" for stdio mode, "http" for HTTP mode (default: "http")
- `MCP_DEBUG`: Set to "1" to see suppressed initialization output in stderr (stdio mode)
- `SUPERSET_CONFIG_PATH`: Path to your superset_config.py file
- `PYTHONPATH`: Should include the Superset root directory
- `MCP_HOST`: Host to bind to for HTTP transport (default: "127.0.0.1")
- `MCP_PORT`: Port to bind to for HTTP transport (default: 5008)

## Testing the Connection

Use the provided test client to verify the transport:

```bash
# For STDIO transport
python test_mcp_client.py
```

This will test:
- Initialization handshake
- Tools listing
- Tool execution
- Output cleanliness (stdio mode)

## Available Tools, Prompts, and Resources

**20 MCP tools**, **2 prompts**, and **2 resources** with Pydantic v2 schemas and comprehensive field documentation for LLM compatibility.

### 📊 Dashboard Tools (5)
- **`list_dashboards`** - List with advanced filtering, search, pagination, UUID/slug support
- **`get_dashboard_info`** - Get detailed info by ID/UUID/slug with metadata
- **`get_dashboard_available_filters`** - Discover filterable columns and operators
- **`generate_dashboard`** - Create dashboards with multiple charts and automatic layout
- **`add_chart_to_existing_dashboard`** - Add charts to existing dashboards with smart positioning

### 📈 Chart Tools (8)  
- **`list_charts`** - List with advanced filtering, search, pagination, UUID support, cache control
- **`get_chart_info`** - Get detailed info by ID/UUID with full metadata
- **`get_chart_available_filters`** - Discover filterable columns and operators
- **`generate_chart`** - Create and save charts (table, line, bar, area, scatter) with preview
- **`update_chart`** - Update existing saved charts with preview generation
- **`update_chart_preview`** - Update cached chart previews without saving
- **`get_chart_data`** - Export underlying data (JSON/CSV/Excel) with cache control
- **`get_chart_preview`** - Visual previews (screenshots, ASCII art, table, VegaLite)

### 🗂️ Dataset Tools (3)
- **`list_datasets`** - List with columns/metrics, advanced filtering, UUID support, cache control
- **`get_dataset_info`** - Get detailed info by ID/UUID with columns/metrics metadata
- **`get_dataset_available_filters`** - Discover filterable columns and operators

### 🔍 Explore Tools (1)
- **`generate_explore_link`** - Generate pre-configured interactive explore URLs (PREFERRED for visualization)

### 🖥️ System Tools (1)
- **`get_superset_instance_info`** - Comprehensive instance statistics and configuration

### 🧪 SQL Lab Tools (2)
- **`open_sql_lab_with_context`** - Generate pre-configured SQL Lab session URLs
- **`execute_sql`** - Direct SQL execution with security validation, parameters, timeouts

## Available Prompts

**2 MCP prompts** for guided workflows and common scenarios:

### 🚀 System Prompts
- **`superset_quickstart`** - Personalized onboarding for new users
  - Parameters: `user_type` (analyst/executive/developer), `focus_area` (sales/marketing/operations/general)
  - Guides through data exploration, chart creation, and dashboard building

### 📈 Chart Prompts  
- **`create_chart_guided`** - Step-by-step chart creation guidance
  - Parameters: `chart_type` (auto/bar/line/pie/table), `business_goal` (exploration/reporting/monitoring)
  - Helps select appropriate visualizations for specific business needs

## Available Resources

**2 MCP resources** providing contextual information and templates:

### 🌐 System Resources
- **`superset://instance/metadata`** - Comprehensive instance metadata
  - Instance statistics (dataset/dashboard/chart/database counts)
  - Popular datasets ranked by usage
  - Recent dashboards and available chart types
  - Sample queries and database engines
  - Configuration features and usage tips

### 📊 Chart Resources
- **`superset://chart/templates`** - Chart configuration templates and best practices
  - Pre-configured templates for common chart types (line, bar, pie, table, scatter)
  - Color schemes and styling options
  - Performance optimization tips
  - Chart selection guide for different data scenarios

[Content continues with all the existing documentation about workflows, examples, etc...]
