# Flowchart Engine

A TypeScript-based flowchart execution engine that interprets `.flowchart.json` files containing node-based workflows.

## Overview

A `.flowchart.json` file contains a JSON object that describes a complete workflow system including:
- **Components**: Reusable processing units with typed inputs, outputs, and JavaScript code
- **Nodes**: Instances of components with specific settings 
- **Connections**: Data flow definitions between node outputs and inputs

The engine executes these flowcharts by registering components, creating node instances, and managing typed data flow through the graph.

## Setup

```bash
npm install
```

## Usage

```bash
# Interactive input (will prompt for input)
npm start example.flowchart.json

# Pipe input from echo
echo "hello world" | npm start example.flowchart.json

# File input redirection
npm start example.flowchart.json < input.txt
```

## Development

```bash
# Run tests
npm test
```

### Configuration

Components are defined within flowchart JSON files with typed inputs/outputs and code. The engine provides comprehensive JSON Schema validation for flowchart structure, component definitions, node configuration, and connection compatibility.
