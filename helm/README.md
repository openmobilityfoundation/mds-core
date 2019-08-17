# MDS Helm Chart

## Prerequisites

* A [Kubernetes](https://kubernetes.io) cluster with [Istio 1.1.x](https://istio.io) installed, set as the default context in `kubectl`
* (optional) [Postgresql](https://www.postgresql.org) and [Redis](https://redis.io) backends available to the cluster
* (optional) When deploying to [AWS' Elastic Kubernetes Service (EKS)](https://aws.amazon.com/eks/), you'll need to follow the [documentation](https://docs.aws.amazon.com/eks/latest/userguide/alb-ingress.html) for adding the AWS IAM policies and the ALB ingress controller to your cluster
* First-Party Stable and Banzai Helm Repos:
```
helm repo add stable https://kubernetes-charts.storage.googleapis.com/
helm repo add banzaicloud-stable https://kubernetes-charts.banzaicloud.com/
helm dependency update
```

## Configuration

### Postgresql (optional)

The default `values.yaml` file is pre-configured for use with [Docker Desktop's Kubernetes](https://www.docker.com/products/docker-desktop) implementation. For other stacks, make a copy of `values.yaml` named values.local.yaml, and fill out the empty fields with configuration for your environment (e.g. postgresql and redis settings). To run the backend locally, use the following commands:

```bash
docker run -d \
  -p 5432:5432 \
  -e POSTGRES_USER=mdsadmin \
  -e POSTGRES_DB=mds \
  -e POSTGRES_PASSWORD='Password123#' \
  postgres:10
```

### Redis (optional)

```bash
docker run -d \
  -p 6379:6379 \
  redis:5
```

### Credentials

For the postgresql password, create a secret in kuberenetes.  Remember to add `--namespace=...` to the below command if you are not deploying to the default kubernetes namespace.  (Security note: the command below will put the password string into your command history and also make it briefly visible in the system process table.)

```bash
kubectl create secret generic pg-pass \
  --from-literal 'PG_PASS=Password123#'
```

If you are using a private container image registry, you may need to add its credentials.

```bash
kubectl create secret generic registry-login \
  --from-file=.dockerconfigjson=${HOME}/.docker/config.json \
  --type=kubernetes.io/dockerconfigjson
```

### Helm Chart Configuration (values.yaml)

`apis:` does not need to be modified for normal usage

`useJwtAuth:` enables JWT authorization for each endpoint.  Required for production usage.  Note that some admin operations (e.g. database initialization) require a scoped token - see below for how to work around this when this field is set to `false`.

`useAws:` configures an EKS-specific ingress gateway

`certificateArn:` configures the ingress gateway with an AWS Certificate Manager (ACM) certificate.

`registry`: Image registry domain name for pulling container images.  If empty, helm will look for images on the local host.

### JWT

If you're not using JWT, you'll still need to include a token in the header for APIs requiring an authorization scope.  Here's how to generate a fake scoped token.

```bash
TOKEN=.$(base64 <<< '{"scope": "admin:all test:all"}').
curl -H "Authorization: Bearer $TOKEN" http://localhost/agency/test/initialize
```

## Installation

At this point, you should be able to deploy an MDS cluster from this directory noting that if you're using a custom values file, you'll need to add the argument `--values=...` to this command, if you're using a custom namespace, you'll want to add the `--namespace=...` argument, etc.

```bash
helm install --name mds .
```

## Installation : standalone

In order to locally deploy a self-contained cluster, ie standalone, consider the following operation:

```bash
helm install --set postgresql.internal=true --set redis.internal=true --name mds ./helm
# prometheus
kubectl port-forward $(kubectl get pods -n=istio-system | \
  grep prometheus | cut -d' ' -f1) 9090:9090 -n=istio-system &
# dashboard: optional, requires additional installation steps
kubectl port-forward $(kubectl get pods -n=kube-system | \
  grep kubernetes-dashboard | cut -d' ' -f1) 8443:8443 -n=kube-system &
```

## View

* [prometheus](htttp://localhost:9090)
* (optional) [dashboard](https://localhost:8443)

## Development

Installation of [helm unit-test plugin](https://github.com/lrills/helm-unittest)

```bash
helm plugin install https://github.com/lrills/helm-unittest
```

The following [helm sub-commands](https://helm.sh/docs/helm/) ease chart development:

```bash
# materialize the specified template
helm template --set [KEY]=[VLAUE] ... -x templates/[TEMPLATE] --debug ./helm
# largely the same as 'helm template'
helm install --set [KEY]=[VALUE] ... --dry-run --debug ./helm
# checks the chart for well-formedness
helm lint --set [KEY]=[VALUE] ... --debug ./helm
```

Run tests:

```bash
cd [CHART]
heml unittest .
```

## Uninstall

```bash
helm delete --purge mds
```
