# MDS Helm Chart

## Prerequisites

* A [Kubernetes](https://kubernetes.io) cluster with [Istio 1.1.x](https://istio.io) installed, set as the default context in `kubectl`
* (optional) When deploying to [AWS' Elastic Kubernetes Service (EKS)](https://aws.amazon.com/eks/), you'll need to follow the [documentation](https://docs.aws.amazon.com/eks/latest/userguide/alb-ingress.html) for adding the AWS IAM policies and the ALB ingress controller to your cluster

## Configuration

### Helm Chart Configuration (values.yaml)

`apis:` does not need to be modified for normal usage

`useJwtAuth:` enables JWT authorization for each endpoint.  Required for production usage.  Note that some admin operations (e.g. database initialization) require a scoped token - see below for how to work around this when this field is set to `false`.

`useAws:` configures an EKS-specific ingress gateway

`certificateArn:` configures the ingress gateway with an AWS Certificate Manager (ACM) certificate.

`registry`: Image registry domain name for pulling container images.  If empty, helm will look for images on the local host.

### Helm Repositories

Add the (Bitnami)[https://bitnami.com] repository:

```bash
helm repo add bitnami https://charts.bitnami.com/bitnami
helm dependency update
```

### Credentials

Create a Postgresql password noting the command below will put the password string into your command history and also make it briefly visible in the system process table:

```bash
kubectl create secret generic pg-pass --from-literal 'PG_PASS=Password123#'
```

### JWT

If you're not using JWT, you'll still need to include a token in the header for APIs requiring an authorization scope.  Here's how to generate a fake scoped token:

```bash
TOKEN=.$(base64 <<< '{"scope": "admin:all test:all"}').
curl -H "Authorization: Bearer $TOKEN" http://localhost/agency/test/initialize
```

### Registry 

If you are using a private container image registry, you may need to add its credentials:

```bash
kubectl create secret generic registry-login \
  --from-file=.dockerconfigjson=${HOME}/.docker/config.json \
  --type=kubernetes.io/dockerconfigjson
```

## Installation

At this point, you should be able to deploy an MDS cluster from this directory noting that if you're using a custom values file, you'll need to add the argument `--values=...` to this command, if you're using a custom namespace, you'll want to add the `--namespace=...` argument, etc.:

```bash
helm install --name mds ./helm
# prometheus
kubectl port-forward $(kubectl get pods -n=istio-system | \
  grep prometheus | cut -d' ' -f1) 9090:9090 -n=istio-system &
```

## Dashboards

* [prometheus](htttp://localhost:9090)

## Development (work in progress)

Installation of [helm unit-test plugin](https://github.com/lrills/helm-unittest):

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
heml unittest ./helm
```

## Uninstall

```bash
helm delete --purge mds
```
