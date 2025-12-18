# BusDriver

[![CI](https://github.com/AndyStewart/BusDriver/actions/workflows/ci.yml/badge.svg)](https://github.com/AndyStewart/BusDriver/actions/workflows/ci.yml)

A Visual Studio Code extension for managing Azure Service Bus queues and topics.

## Features

- **Manage Connections**: Add, view, and delete Service Bus namespace connections
- **Secure Storage**: Connection strings are securely stored using VS Code's Secret Storage API
- **Simple Interface**: Activity bar panel for easy access to your Service Bus connections

## Getting Started

1. Click the Service Bus icon in the Activity Bar
2. Click the "+" button to add a new connection
3. Enter a name for your connection
4. Provide your Service Bus connection string

## Requirements

- VS Code 1.85.0 or higher
- Azure Service Bus namespace

## Extension Settings

This extension currently has no configurable settings.

## Known Issues

This is an early version. More features coming soon!

## Release Notes

### 0.1.0

Initial release of BusDriver
- Add/delete Service Bus connections
- Secure connection string storage

---

## Development

### Build

```bash
npm install
npm run compile
```

### Run Extension

Press F5 to open a new VS Code window with the extension loaded.

### Run Tests

```bash
npm test
```

## License

See LICENSE file for details.
