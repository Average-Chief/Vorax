# Contributing to A2A Gateway

Thank you for your interest in contributing to A2A Gateway!

## Development & Testing Workflow

Before opening a pull request, please verify that your changes pass all local verification gates:

### 1. Backend Verification
Install development dependencies and run the test suite:
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
pytest tests/
```

### 2. Frontend Verification
Ensure TypeScript types compile and the Vite production bundle builds cleanly:
```bash
cd dashboard
npm install
npm run build
```

## Pull Request Guidelines

1. **Keep PRs focused**: Each PR should address one bug fix or one coherent feature.
2. **Include tests**: Add unit or integration tests under `tests/` covering new endpoints, state transitions, or durability logic.
3. **CI Gate**: All incoming PRs run automated tests against backend test suites and frontend builds via GitHub Actions.
4. **Maintain compatibility**: Do not break existing A2A JSON-RPC protocol proxying or forensic event retention guarantees.

