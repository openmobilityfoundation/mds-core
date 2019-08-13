# MDS Helm Chart

## Prerequisites

* A Kubernetes cluster with Istio 1.1.x installed, set as the default context in `kubectl`.
* Postgresql and Redis backends available to the cluster

If using AWS' Elastic Kubernetes Service (EKS), you'll need to follow the [documentation](https://docs.aws.amazon.com/eks/latest/userguide/alb-ingress.html) for adding the AWS IAM policies and the ALB ingress controller to your cluster.

## Configuration

The default `values.yaml` file is pre-configured for use with Docker Desktop's Kubernetes implementation.  For other stacks, make a copy of `values.yaml` named values.local.yaml, and fill out the empty fields with configuration for your environment (e.g. postgresql and redis settings).  To run the backend locally, use the following commands:

```bash
docker run -d \
    -p 5432:5432 \
    -e POSTGRES_USER=mdsadmin \
    -e POSTGRES_DB=mds \
    -e POSTGRES_PASSWORD='Password123#' \
    postgres:10

docker run -d \
    -p 6379:6379 \
    redis:5
```

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

## Configuration (values.yaml)

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

### Installation : alpha

In order to locally deploy a fully self-contained cluster, ie standalone-cluster, consider the following operation:

```bash
helm install --set postgresql.enabled=true,redis.enabled=true --name mds .
```

## Cleanup

```bash
helm delete --purge mds
```
