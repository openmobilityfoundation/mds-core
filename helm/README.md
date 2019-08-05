h1. MDS Helm Chart

h2. Prerequisites

* A Kubernetes cluster with Istio 1.1.x installed, set as the default context in `kubectl`.
* Postgresql and Redis backends available to the cluster

h2. Configuration

Make a copy of `values.yaml` named values.local.yaml, and fill out the empty fields with configuration for your environment (e.g. postgresql and redis settings).

For the postgresql password, create a secret in kuberenetes as follows (replacing the bogus password below with your actual postgresql password):

```
PG_PASS=$(echo -n 'Password123#' | base64)
kubectl apply -f- <<EOF
apiVersion: v1
metadata:
  name: pg-pass
data:
  PG_PASS: ${PG_PASS}
kind: Secret
type: Opaque
EOF
```

If you are using a private container image registry, you may need to add the secret for that as follows:

```
kubectl create secret generic registry-login \
    --from-file=.dockerconfigjson=${HOME}/.docker/config.json \
    --type=kubernetes.io/dockerconfigjson
```

h2. Installation

At this point, you should be able to run `helm install --name mds .` from this directory.
