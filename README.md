# Flowchart Engine

A TypeScript-based flowchart execution engine that interprets `.flowchart.json` files containing node-based workflows.

## Overview

A `.flowchart.json` file contains a JSON object that describes a set of processing nodes and the connections between them. The engine executes these flowcharts by creating component instances, connecting their inputs and outputs, and managing data flow through the graph.

## Architecture

### Flowchart Structure

A flowchart consists of:

- **Nodes**: Processing components with typed inputs, outputs, and configurable settings
- **Connections**: Data flow definitions between node outputs and inputs

## Current Implementation

This is a **CLI-only** prototype implementation limited to running the provided example flowchart.

## Usage

### Running a Flowchart

```bash
# Interactive input
npm start example.flowchart.json

# Pipe input
echo "hello world" | npm start example.flowchart.json

# File input
npm start example.flowchart.json < input.txt
```

## Development

### Testing

```bash
npm test
```

### Type Checking

The project uses TypeScript with strict type checking and JSON Schema validation for runtime type safety.

## Schema Validation

The engine validates:
- Node type compatibility
- Connection type matching
- Required property presence
- JSON Schema compliance for all data types
