A `.flowchart.json` file contains a JSON object that fully describes a set of processes and the connections between them.

A flowchart consists of nodes, each representing a process, and connections that define the flow of execution and data.

Each node has a number of inputs and outputs, which can be connected to other nodes. Inputs and outputs have types defined using JSON Schema. Only compatible output types can be connected to input types.

Nodes also have a set of properties, represented by a single connection, which can be used to pass additional configuration data to the node at runtime, or can be fully or partially pre-defined in the flowchart.

Every node can be generalized as an asynchronous function: calculations, API calls, LLM inferences, storage, data queues, etc. Undecided: How to define the functions.

A flowchart can be executed in a runtime environment, either CLI or GUI based. The environment handles interaction with the user by requesting input and showing notifications and results.

This project features both a web-based GUI application and a small CLI application.

The web-based GUI displays flowchart processes as nodes and allows users to create, edit, and interact with the running flowchart, receive notifications, results, warnings, and more in real time.

The CLI application is a simple interpreter for `.flowchart` files, allowing users to run flowcharts in a terminal environment and receive notifications and results in the terminal.

The flowchart inputs and outputs are verified statically at build time, but also data is validated at runtime to ensure that the flowchart is executed correctly.
