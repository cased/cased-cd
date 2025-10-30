# Cased CD Helm Chart Repository

This branch contains the Helm chart repository for Cased CD, automatically published from the `main` branch.

## Usage

Add the Helm repository:

```bash
helm repo add cased https://cased.github.io/cased-cd
helm repo update
```

Install Cased CD:

```bash
helm install cased-cd cased/cased-cd --namespace argocd
```

## Chart Source

The chart source code is maintained in the `chart/` directory on the `main` branch.

See the [main repository](https://github.com/cased/cased-cd) for documentation and source code.
